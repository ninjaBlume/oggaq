<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A pending e-mail change lives on the user until the new address proves itself; a token remembers which kind of
        // device it was issued to so the device list can say more than a random id.
        Schema::table('users', function (Blueprint $table) {
            $table->string('pending_email', 254)->nullable();
            $table->timestampTz('pending_email_requested_at')->nullable();
        });
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->string('device_label', 60)->nullable();
        });
        // Account deletion is the only path allowed to remove finished exam answers and to clear a report's free text.
        // It says so with a transaction-local setting; outside it both guards behave exactly as before.
        DB::unprepared(<<<'SQL'
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
END $$ LANGUAGE plpgsql
SQL);
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_question_report() RETURNS trigger AS $$
BEGIN
    IF ROW(NEW.id, NEW.question_id, NEW.question_version_id, NEW.reason, NEW.created_at)
        IS DISTINCT FROM ROW(OLD.id, OLD.question_id, OLD.question_version_id, OLD.reason, OLD.created_at)
        OR (NEW.note IS DISTINCT FROM OLD.note AND NOT (coalesce(current_setting('oggaq.account_erasure', true), '') = 'on' AND NEW.note IS NULL)) THEN
        RAISE EXCEPTION 'Question report content is immutable' USING ERRCODE = '23514';
    END IF;
    IF (NEW.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id)
        OR (NEW.exam_attempt_id IS NOT NULL AND NEW.exam_attempt_id IS DISTINCT FROM OLD.exam_attempt_id)
        OR (NEW.resolved_by IS NOT NULL AND OLD.resolved_by IS NOT NULL AND NEW.resolved_by <> OLD.resolved_by) THEN
        RAISE EXCEPTION 'Question report links can only be severed' USING ERRCODE = '23514';
    END IF;
    IF OLD.status <> 'open' AND (NEW.status <> OLD.status OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
        OR NEW.resolution_note IS DISTINCT FROM OLD.resolution_note) THEN
        RAISE EXCEPTION 'A resolved question report is closed' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_question_report() RETURNS trigger AS $$
BEGIN
    IF ROW(NEW.id, NEW.question_id, NEW.question_version_id, NEW.reason, NEW.note, NEW.created_at)
        IS DISTINCT FROM ROW(OLD.id, OLD.question_id, OLD.question_version_id, OLD.reason, OLD.note, OLD.created_at) THEN
        RAISE EXCEPTION 'Question report content is immutable' USING ERRCODE = '23514';
    END IF;
    IF (NEW.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id)
        OR (NEW.exam_attempt_id IS NOT NULL AND NEW.exam_attempt_id IS DISTINCT FROM OLD.exam_attempt_id)
        OR (NEW.resolved_by IS NOT NULL AND OLD.resolved_by IS NOT NULL AND NEW.resolved_by <> OLD.resolved_by) THEN
        RAISE EXCEPTION 'Question report links can only be severed' USING ERRCODE = '23514';
    END IF;
    IF OLD.status <> 'open' AND (NEW.status <> OLD.status OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
        OR NEW.resolution_note IS DISTINCT FROM OLD.resolution_note) THEN
        RAISE EXCEPTION 'A resolved question report is closed' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SQL);
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_exam_answer() RETURNS trigger AS $$
DECLARE parent_id uuid; parent_finish timestamptz; parent_deadline timestamptz; parent_official uuid; correct_id uuid; publication_time timestamptz;
BEGIN
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
END $$ LANGUAGE plpgsql
SQL);
        Schema::table('personal_access_tokens', fn (Blueprint $table) => $table->dropColumn('device_label'));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['pending_email', 'pending_email_requested_at']));
    }
};
