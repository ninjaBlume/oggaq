<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Central, platform-managed past exams: ordered, pinned to immutable published question versions.
        Schema::create('official_exams', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_type_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('source_id')->nullable()->constrained('question_sources')->restrictOnDelete();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title', 240);
            $table->unsignedSmallInteger('year');
            $table->string('term', 80)->nullable();
            $table->string('exam_number', 40)->nullable();
            $table->timestampTz('published_at')->nullable();
            $table->timestampsTz();
            $table->index(['published_at', 'year', 'id']);
            $table->index(['exam_type_id', 'year']);
        });
        DB::statement('ALTER TABLE official_exams ADD CONSTRAINT official_exam_valid CHECK (year BETWEEN 1990 AND 2200 AND length(trim(title)) > 0)');
        DB::statement('CREATE UNIQUE INDEX official_exams_identity_unique ON official_exams (exam_type_id, year, term, exam_number) NULLS NOT DISTINCT');
        Schema::create('official_exam_questions', function (Blueprint $table) {
            $table->foreignUuid('official_exam_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('position');
            $table->uuid('question_id');
            $table->uuid('question_version_id');
            $table->primary(['official_exam_id', 'position']);
            $table->unique(['official_exam_id', 'question_id']);
            $table->foreign(['question_version_id', 'question_id'])->references(['id', 'question_id'])->on('question_versions')->restrictOnDelete();
            $table->index('question_id');
        });
        DB::statement('ALTER TABLE official_exam_questions ADD CONSTRAINT official_exam_position_valid CHECK (position BETWEEN 1 AND 100)');
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_official_exam() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total integer; last_position integer;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        IF OLD.published_at IS NOT NULL THEN
            RAISE EXCEPTION 'Published official exams are immutable' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NEW.published_at IS NOT NULL THEN
        SELECT count(*), coalesce(max(position), 0) INTO total, last_position FROM official_exam_questions WHERE official_exam_id = NEW.id;
        IF total < 1 OR last_position <> total THEN
            RAISE EXCEPTION 'Publication requires contiguous positions starting at one' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER guard_official_exam BEFORE INSERT OR UPDATE OR DELETE ON official_exams
FOR EACH ROW EXECUTE FUNCTION guard_official_exam();

CREATE OR REPLACE FUNCTION guard_official_exam_question() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id uuid; parent_published timestamptz; version_published timestamptz;
BEGIN
    IF TG_OP = 'DELETE' THEN parent_id := OLD.official_exam_id; ELSE parent_id := NEW.official_exam_id; END IF;
    SELECT published_at INTO parent_published FROM official_exams WHERE id = parent_id FOR UPDATE;
    IF parent_published IS NOT NULL THEN
        RAISE EXCEPTION 'Published official exam questions are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    SELECT published_at INTO version_published FROM question_versions WHERE id = NEW.question_version_id;
    IF version_published IS NULL THEN
        RAISE EXCEPTION 'Official exams require published question versions' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER guard_official_exam_question BEFORE INSERT OR UPDATE OR DELETE ON official_exam_questions
FOR EACH ROW EXECUTE FUNCTION guard_official_exam_question();
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('official_exam_questions');
        Schema::dropIfExists('official_exams');
        DB::statement('DROP FUNCTION IF EXISTS guard_official_exam_question()');
        DB::statement('DROP FUNCTION IF EXISTS guard_official_exam()');
    }
};
