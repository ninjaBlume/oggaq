<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('study_context_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('subject_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignUuid('topic_id')->nullable()->constrained()->restrictOnDelete();
            $table->unsignedInteger('question_count');
            $table->unsignedInteger('duration_seconds');
            $table->string('scoring_rule', 40);
            $table->unsignedInteger('revision')->default(1);
            $table->timestampTz('started_at');
            $table->timestampTz('deadline_at');
            $table->timestampTz('finished_at')->nullable();
            $table->string('finish_reason', 20)->nullable();
            $table->unsignedInteger('correct_count')->nullable();
            $table->unsignedInteger('incorrect_count')->nullable();
            $table->unsignedInteger('blank_count')->nullable();
            $table->decimal('score_percent', 5, 2)->nullable();
            $table->index(['study_context_id', 'started_at', 'id']);
            $table->index(['finished_at', 'deadline_at']);
        });
        Schema::create('exam_answers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_attempt_id')->constrained()->restrictOnDelete();
            $table->uuid('question_id');
            $table->uuid('question_version_id');
            $table->unsignedInteger('position');
            $table->uuid('selected_option_id')->nullable();
            $table->boolean('is_correct')->nullable();
            $table->unique(['exam_attempt_id', 'position']);
            $table->unique(['exam_attempt_id', 'question_id']);
            $table->foreign(['question_version_id', 'question_id'])->references(['id', 'question_id'])->on('question_versions')->restrictOnDelete();
            $table->foreign(['selected_option_id', 'question_version_id'])->references(['id', 'question_version_id'])->on('question_options')->restrictOnDelete();
        });
        DB::statement("ALTER TABLE exam_attempts ADD CONSTRAINT exam_settings_valid CHECK (question_count BETWEEN 1 AND 100 AND duration_seconds BETWEEN 60 AND 7200 AND revision > 0 AND scoring_rule = 'correct_ratio_v1' AND deadline_at = started_at + duration_seconds * interval '1 second')");
        DB::statement("ALTER TABLE exam_attempts ADD CONSTRAINT exam_result_valid CHECK ((finished_at IS NULL AND finish_reason IS NULL AND correct_count IS NULL AND incorrect_count IS NULL AND blank_count IS NULL AND score_percent IS NULL) OR (finished_at IS NOT NULL AND finish_reason IS NOT NULL AND correct_count IS NOT NULL AND incorrect_count IS NOT NULL AND blank_count IS NOT NULL AND score_percent IS NOT NULL AND finished_at >= started_at AND finished_at <= deadline_at AND finish_reason IN ('manual', 'expired') AND correct_count >= 0 AND incorrect_count >= 0 AND blank_count >= 0 AND correct_count + incorrect_count + blank_count = question_count AND score_percent BETWEEN 0 AND 100))");
        DB::statement('ALTER TABLE exam_answers ADD CONSTRAINT exam_answer_position_valid CHECK (position BETWEEN 1 AND 100)');
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_exam_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total_count integer; actual_correct integer; actual_incorrect integer; actual_blank integer;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.finished_at IS NOT NULL THEN
        RAISE EXCEPTION 'Exam must start unfinished' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF OLD.finished_at IS NOT NULL OR ROW(NEW.id, NEW.study_context_id, NEW.subject_id, NEW.topic_id, NEW.question_count, NEW.duration_seconds, NEW.scoring_rule, NEW.started_at, NEW.deadline_at) IS DISTINCT FROM ROW(OLD.id, OLD.study_context_id, OLD.subject_id, OLD.topic_id, OLD.question_count, OLD.duration_seconds, OLD.scoring_rule, OLD.started_at, OLD.deadline_at) OR NEW.revision <> OLD.revision + 1 THEN
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
CREATE TRIGGER guard_exam_attempt BEFORE INSERT OR UPDATE ON exam_attempts FOR EACH ROW EXECUTE FUNCTION guard_exam_attempt();

CREATE OR REPLACE FUNCTION guard_exam_answer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id uuid; parent_finish timestamptz; parent_deadline timestamptz; correct_id uuid; publication_time timestamptz;
BEGIN
    IF TG_OP = 'DELETE' THEN parent_id := OLD.exam_attempt_id; ELSE parent_id := NEW.exam_attempt_id; END IF;
    SELECT finished_at, deadline_at INTO parent_finish, parent_deadline FROM exam_attempts WHERE id = parent_id FOR UPDATE;
    IF parent_finish IS NOT NULL THEN
        RAISE EXCEPTION 'Completed exam answers are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Pinned exam questions cannot be removed' USING ERRCODE = '23514';
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
END $$;
CREATE TRIGGER guard_exam_answer BEFORE INSERT OR UPDATE OR DELETE ON exam_answers FOR EACH ROW EXECUTE FUNCTION guard_exam_answer();
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_answers');
        Schema::dropIfExists('exam_attempts');
        DB::statement('DROP FUNCTION IF EXISTS guard_exam_answer()');
        DB::statement('DROP FUNCTION IF EXISTS guard_exam_attempt()');
    }
};
