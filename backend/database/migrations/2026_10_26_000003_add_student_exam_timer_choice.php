<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->string('timer_policy', 20)->default('continuous');
            $table->timestampTz('paused_at')->nullable();
            $table->unsignedInteger('paused_seconds')->default(0);
            $table->timestampTz('clock_seen_at')->nullable();
            $table->uuid('timer_session_id')->nullable();
        });
        DB::unprepared(<<<'SQL'
ALTER TABLE exam_attempts DROP CONSTRAINT exam_settings_valid;
ALTER TABLE exam_attempts ADD CONSTRAINT exam_settings_valid CHECK (question_count BETWEEN 1 AND 200 AND duration_seconds BETWEEN 60 AND 10800 AND revision > 0 AND scoring_rule = 'correct_ratio_v1' AND paused_seconds >= 0 AND deadline_at = started_at + (duration_seconds + paused_seconds) * interval '1 second');
ALTER TABLE exam_attempts ADD CONSTRAINT exam_timer_valid CHECK (
    (timer_policy = 'continuous' AND paused_at IS NULL AND paused_seconds = 0 AND clock_seen_at IS NULL AND timer_session_id IS NULL)
    OR (timer_policy = 'pause_on_exit' AND ((paused_at IS NOT NULL AND paused_at >= started_at AND paused_at < deadline_at) OR (paused_at IS NULL AND clock_seen_at IS NOT NULL AND timer_session_id IS NOT NULL)))
);
CREATE OR REPLACE FUNCTION guard_exam_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total_count integer; actual_correct integer; actual_incorrect integer; actual_blank integer; template_count integer;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.finished_at IS NOT NULL THEN
        RAISE EXCEPTION 'Exam must start unfinished' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'INSERT' AND NEW.official_exam_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM official_exams WHERE id = NEW.official_exam_id AND published_at IS NOT NULL) THEN
            RAISE EXCEPTION 'Official exam attempts require a published official exam' USING ERRCODE = '23514';
        END IF;
        SELECT count(*) INTO template_count FROM official_exam_questions WHERE official_exam_id = NEW.official_exam_id;
        IF NEW.question_count <> template_count OR NEW.subject_id IS NOT NULL OR NEW.topic_id IS NOT NULL THEN
            RAISE EXCEPTION 'Official exam attempts must use the complete unfiltered template' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF OLD.finished_at IS NOT NULL OR ROW(NEW.id, NEW.study_context_id, NEW.subject_id, NEW.topic_id, NEW.official_exam_id, NEW.question_count, NEW.duration_seconds, NEW.scoring_rule, NEW.started_at, NEW.timer_policy) IS DISTINCT FROM ROW(OLD.id, OLD.study_context_id, OLD.subject_id, OLD.topic_id, OLD.official_exam_id, OLD.question_count, OLD.duration_seconds, OLD.scoring_rule, OLD.started_at, OLD.timer_policy) OR (NEW.revision <> OLD.revision + 1 AND NOT (NEW.revision = OLD.revision AND (to_jsonb(NEW) - 'clock_seen_at') = (to_jsonb(OLD) - 'clock_seen_at'))) THEN
            RAISE EXCEPTION 'Exam snapshot and completed results are immutable' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF NEW.paused_seconds IS DISTINCT FROM OLD.paused_seconds OR NEW.deadline_at IS DISTINCT FROM OLD.deadline_at OR (OLD.paused_at IS NOT NULL AND NEW.paused_at IS NULL) THEN
            IF OLD.timer_policy <> 'pause_on_exit' OR OLD.paused_at IS NULL OR NEW.paused_at IS NOT NULL OR NEW.clock_seen_at IS NULL
                OR NEW.paused_seconds <> OLD.paused_seconds + greatest(0, floor(extract(epoch FROM (NEW.clock_seen_at - OLD.paused_at))))
                OR NEW.deadline_at <> OLD.deadline_at + (NEW.paused_seconds - OLD.paused_seconds) * interval '1 second' THEN
                RAISE EXCEPTION 'Only resuming a paused timer may extend its deadline' USING ERRCODE = '23514';
            END IF;
        END IF;
        IF OLD.paused_at IS NOT NULL AND NEW.paused_at IS NOT NULL AND NEW.paused_at IS DISTINCT FROM OLD.paused_at THEN
            RAISE EXCEPTION 'A saved pause cannot move' USING ERRCODE = '23514';
        END IF;
        IF NEW.clock_seen_at < OLD.clock_seen_at THEN
            RAISE EXCEPTION 'Exam clock cannot go backwards' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF NEW.finished_at IS NOT NULL AND NEW.timer_policy = 'pause_on_exit' AND
        (NEW.paused_at IS NOT NULL OR NEW.clock_seen_at IS NULL OR (NEW.deadline_at > NEW.clock_seen_at + interval '30 seconds' AND statement_timestamp() >= NEW.clock_seen_at + interval '30 seconds')) THEN
        RAISE EXCEPTION 'A paused exam cannot be finalized' USING ERRCODE = '23514';
    END IF;
    IF NEW.finished_at IS NOT NULL THEN
        SELECT count(*), count(*) FILTER (WHERE is_correct = true), count(*) FILTER (WHERE selected_option_id IS NOT NULL AND is_correct = false), count(*) FILTER (WHERE selected_option_id IS NULL AND is_correct = false)
        INTO total_count, actual_correct, actual_incorrect, actual_blank FROM exam_answers WHERE exam_attempt_id = NEW.id;
        IF total_count = 0 THEN
            RAISE EXCEPTION 'Exam cannot be empty' USING ERRCODE = '23514';
        END IF;
        IF total_count <> NEW.question_count OR actual_correct + actual_incorrect + actual_blank <> total_count OR NEW.correct_count <> actual_correct OR NEW.incorrect_count <> actual_incorrect OR NEW.blank_count <> actual_blank OR NEW.score_percent <> round(actual_correct * 100.0 / total_count, 2) OR (NEW.finish_reason = 'expired' AND NEW.finished_at <> NEW.deadline_at) OR (NEW.finish_reason = 'manual' AND NEW.finished_at >= NEW.deadline_at) THEN
            RAISE EXCEPTION 'Exam result must match all pinned answers and deadline' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION guard_exam_answer() RETURNS trigger AS $$
DECLARE parent_id uuid; parent_finish timestamptz; parent_deadline timestamptz; parent_official uuid; correct_id uuid; publication_time timestamptz;
BEGIN
    IF TG_OP = 'DELETE' AND coalesce(current_setting('oggaq.account_erasure', true), '') = 'on' THEN
        RETURN OLD;
    END IF;
    IF TG_OP = 'DELETE' THEN parent_id := OLD.exam_attempt_id; ELSE parent_id := NEW.exam_attempt_id; END IF;
    SELECT finished_at, deadline_at, official_exam_id INTO parent_finish, parent_deadline, parent_official FROM exam_attempts WHERE id = parent_id FOR UPDATE;
    IF parent_finish IS NOT NULL THEN
        RAISE EXCEPTION 'Completed exam answers are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Pinned exam questions cannot be removed' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'INSERT' AND parent_official IS NOT NULL AND NOT EXISTS (SELECT 1 FROM official_exam_questions WHERE official_exam_id = parent_official AND position = NEW.position AND question_id = NEW.question_id AND question_version_id = NEW.question_version_id) THEN
        RAISE EXCEPTION 'Official exam answers must keep the original order and pinned versions' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND ROW(NEW.id, NEW.exam_attempt_id, NEW.question_id, NEW.question_version_id, NEW.position) IS DISTINCT FROM ROW(OLD.id, OLD.exam_attempt_id, OLD.question_id, OLD.question_version_id, OLD.position) THEN
        RAISE EXCEPTION 'Pinned exam question identity cannot change' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.selected_option_id IS DISTINCT FROM OLD.selected_option_id AND statement_timestamp() >= parent_deadline THEN
        RAISE EXCEPTION 'Exam deadline has passed' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.selected_option_id IS DISTINCT FROM OLD.selected_option_id AND EXISTS (
        SELECT 1 FROM exam_attempts WHERE id = parent_id AND timer_policy = 'pause_on_exit'
        AND (paused_at IS NOT NULL OR clock_seen_at IS NULL OR statement_timestamp() >= clock_seen_at + interval '30 seconds')
    ) THEN
        RAISE EXCEPTION 'Exam timer is paused' USING ERRCODE = '23514';
    END IF;
    SELECT correct_option_id, published_at INTO correct_id, publication_time FROM question_versions WHERE id = NEW.question_version_id;
    IF publication_time IS NULL OR (NEW.is_correct IS NOT NULL AND NEW.is_correct IS DISTINCT FROM (NEW.selected_option_id IS NOT NULL AND NEW.selected_option_id = correct_id)) THEN
        RAISE EXCEPTION 'Exam requires a published version and its actual answer key' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
SQL);
    }

    public function down(): void
    {
        if (DB::table('exam_attempts')->where('timer_policy', 'pause_on_exit')->exists()) {
            throw new RuntimeException('Pause history exists; timer columns cannot be discarded.');
        }
        DB::unprepared(<<<'SQL'
ALTER TABLE exam_attempts DROP CONSTRAINT exam_timer_valid;
ALTER TABLE exam_attempts DROP CONSTRAINT exam_settings_valid;
ALTER TABLE exam_attempts ADD CONSTRAINT exam_settings_valid CHECK (question_count BETWEEN 1 AND 200 AND duration_seconds BETWEEN 60 AND 10800 AND revision > 0 AND scoring_rule = 'correct_ratio_v1' AND deadline_at = started_at + duration_seconds * interval '1 second');
CREATE OR REPLACE FUNCTION guard_exam_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total_count integer; actual_correct integer; actual_incorrect integer; actual_blank integer; template_count integer;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.finished_at IS NOT NULL THEN
        RAISE EXCEPTION 'Exam must start unfinished' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'INSERT' AND NEW.official_exam_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM official_exams WHERE id = NEW.official_exam_id AND published_at IS NOT NULL) THEN
            RAISE EXCEPTION 'Official exam attempts require a published official exam' USING ERRCODE = '23514';
        END IF;
        SELECT count(*) INTO template_count FROM official_exam_questions WHERE official_exam_id = NEW.official_exam_id;
        IF NEW.question_count <> template_count OR NEW.subject_id IS NOT NULL OR NEW.topic_id IS NOT NULL THEN
            RAISE EXCEPTION 'Official exam attempts must use the complete unfiltered template' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF OLD.finished_at IS NOT NULL OR ROW(NEW.id, NEW.study_context_id, NEW.subject_id, NEW.topic_id, NEW.official_exam_id, NEW.question_count, NEW.duration_seconds, NEW.scoring_rule, NEW.started_at, NEW.deadline_at) IS DISTINCT FROM ROW(OLD.id, OLD.study_context_id, OLD.subject_id, OLD.topic_id, OLD.official_exam_id, OLD.question_count, OLD.duration_seconds, OLD.scoring_rule, OLD.started_at, OLD.deadline_at) OR NEW.revision <> OLD.revision + 1 THEN
            RAISE EXCEPTION 'Exam snapshot and completed results are immutable' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF NEW.finished_at IS NOT NULL THEN
        SELECT count(*), count(*) FILTER (WHERE is_correct = true), count(*) FILTER (WHERE selected_option_id IS NOT NULL AND is_correct = false), count(*) FILTER (WHERE selected_option_id IS NULL AND is_correct = false)
        INTO total_count, actual_correct, actual_incorrect, actual_blank FROM exam_answers WHERE exam_attempt_id = NEW.id;
        IF total_count = 0 THEN
            RAISE EXCEPTION 'Exam cannot be empty' USING ERRCODE = '23514';
        END IF;
        IF total_count <> NEW.question_count OR actual_correct + actual_incorrect + actual_blank <> total_count OR NEW.correct_count <> actual_correct OR NEW.incorrect_count <> actual_incorrect OR NEW.blank_count <> actual_blank OR NEW.score_percent <> round(actual_correct * 100.0 / total_count, 2) OR (NEW.finish_reason = 'expired' AND NEW.finished_at <> NEW.deadline_at) OR (NEW.finish_reason = 'manual' AND NEW.finished_at >= NEW.deadline_at) THEN
            RAISE EXCEPTION 'Exam result must match all pinned answers and deadline' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION guard_exam_answer() RETURNS trigger AS $$
DECLARE parent_id uuid; parent_finish timestamptz; parent_deadline timestamptz; parent_official uuid; correct_id uuid; publication_time timestamptz;
BEGIN
    IF TG_OP = 'DELETE' AND coalesce(current_setting('oggaq.account_erasure', true), '') = 'on' THEN
        RETURN OLD;
    END IF;
    IF TG_OP = 'DELETE' THEN parent_id := OLD.exam_attempt_id; ELSE parent_id := NEW.exam_attempt_id; END IF;
    SELECT finished_at, deadline_at, official_exam_id INTO parent_finish, parent_deadline, parent_official FROM exam_attempts WHERE id = parent_id FOR UPDATE;
    IF parent_finish IS NOT NULL THEN
        RAISE EXCEPTION 'Completed exam answers are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Pinned exam questions cannot be removed' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'INSERT' AND parent_official IS NOT NULL AND NOT EXISTS (SELECT 1 FROM official_exam_questions WHERE official_exam_id = parent_official AND position = NEW.position AND question_id = NEW.question_id AND question_version_id = NEW.question_version_id) THEN
        RAISE EXCEPTION 'Official exam answers must keep the original order and pinned versions' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND ROW(NEW.id, NEW.exam_attempt_id, NEW.question_id, NEW.question_version_id, NEW.position) IS DISTINCT FROM ROW(OLD.id, OLD.exam_attempt_id, OLD.question_id, OLD.question_version_id, OLD.position) THEN
        RAISE EXCEPTION 'Pinned exam question identity cannot change' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.selected_option_id IS DISTINCT FROM OLD.selected_option_id AND statement_timestamp() >= parent_deadline THEN
        RAISE EXCEPTION 'Exam deadline has passed' USING ERRCODE = '23514';
    END IF;
    SELECT correct_option_id, published_at INTO correct_id, publication_time FROM question_versions WHERE id = NEW.question_version_id;
    IF publication_time IS NULL OR (NEW.is_correct IS NOT NULL AND NEW.is_correct IS DISTINCT FROM (NEW.selected_option_id IS NOT NULL AND NEW.selected_option_id = correct_id)) THEN
        RAISE EXCEPTION 'Exam requires a published version and its actual answer key' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
SQL);
        Schema::table('exam_attempts', fn (Blueprint $table) => $table->dropColumn(['timer_policy', 'paused_at', 'paused_seconds', 'clock_seen_at', 'timer_session_id']));
    }
};
