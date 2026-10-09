<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('practice_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('study_context_id')->constrained()->restrictOnDelete();
            $table->uuid('question_id');
            $table->uuid('question_version_id');
            $table->uuid('selected_option_id')->nullable();
            $table->boolean('is_correct')->nullable();
            $table->timestampTz('created_at');
            $table->timestampTz('answered_at')->nullable();
            $table->foreign(['question_version_id', 'question_id'])->references(['id', 'question_id'])->on('question_versions')->restrictOnDelete();
            $table->foreign(['selected_option_id', 'question_version_id'])->references(['id', 'question_version_id'])->on('question_options')->restrictOnDelete();
            $table->index(['study_context_id', 'created_at', 'id']);
        });
        DB::statement('ALTER TABLE practice_attempts ADD CONSTRAINT practice_attempt_state CHECK ((answered_at IS NULL AND selected_option_id IS NULL AND is_correct IS NULL) OR (answered_at IS NOT NULL AND answered_at >= created_at AND is_correct IS NOT NULL AND (selected_option_id IS NOT NULL OR is_correct = false)))');
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_practice_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE correct_id uuid; published_time timestamptz;
BEGIN
    IF TG_OP = 'UPDATE' AND (OLD.answered_at IS NOT NULL OR NEW.id <> OLD.id OR NEW.study_context_id <> OLD.study_context_id OR NEW.question_id <> OLD.question_id OR NEW.question_version_id <> OLD.question_version_id OR NEW.created_at <> OLD.created_at) THEN
        RAISE EXCEPTION 'Practice identity and completed results are immutable' USING ERRCODE = '23514';
    END IF;
    SELECT correct_option_id, published_at INTO correct_id, published_time FROM question_versions WHERE id = NEW.question_version_id;
    IF published_time IS NULL THEN
        RAISE EXCEPTION 'Practice requires a published version' USING ERRCODE = '23514';
    END IF;
    IF NEW.answered_at IS NOT NULL AND NEW.is_correct IS DISTINCT FROM (NEW.selected_option_id IS NOT NULL AND NEW.selected_option_id = correct_id) THEN
        RAISE EXCEPTION 'Practice grade must match the pinned answer key' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER guard_practice_attempt BEFORE INSERT OR UPDATE ON practice_attempts
FOR EACH ROW EXECUTE FUNCTION guard_practice_attempt();
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('practice_attempts');
        DB::statement('DROP FUNCTION IF EXISTS guard_practice_attempt()');
    }
};
