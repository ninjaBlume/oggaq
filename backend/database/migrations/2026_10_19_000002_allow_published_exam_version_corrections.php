<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// A published past exam stays fixed except for one audited correction: a pinned question moves to a newer
// published version of the same question (position, membership and order never change). Attempts keep the
// versions they started with; only attempts started afterwards see the corrected question.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('official_exam_question_changes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('official_exam_id')->constrained('official_exams')->restrictOnDelete();
            $table->foreignUuid('question_id')->constrained('questions')->restrictOnDelete();
            $table->foreignUuid('from_version_id')->constrained('question_versions')->restrictOnDelete();
            $table->foreignUuid('to_version_id')->constrained('question_versions')->restrictOnDelete();
            $table->foreignUuid('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('created_at');
            $table->index(['official_exam_id', 'created_at']);
        });
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_official_exam_question() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id uuid; parent_published timestamptz;
BEGIN
    IF TG_OP = 'DELETE' THEN parent_id := OLD.official_exam_id; ELSE parent_id := NEW.official_exam_id; END IF;
    SELECT published_at INTO parent_published FROM official_exams WHERE id = parent_id FOR UPDATE;
    IF parent_published IS NOT NULL THEN
        IF TG_OP = 'UPDATE' AND NEW.official_exam_id = OLD.official_exam_id AND NEW.position = OLD.position AND NEW.question_id = OLD.question_id
            AND NEW.question_version_id <> OLD.question_version_id
            AND EXISTS (
                SELECT 1 FROM question_versions next JOIN question_versions current ON current.id = OLD.question_version_id
                WHERE next.id = NEW.question_version_id AND next.question_id = OLD.question_id AND next.published_at IS NOT NULL AND next.version > current.version
            ) THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Published official exam questions are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_official_exam_question() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id uuid; parent_published timestamptz;
BEGIN
    IF TG_OP = 'DELETE' THEN parent_id := OLD.official_exam_id; ELSE parent_id := NEW.official_exam_id; END IF;
    SELECT published_at INTO parent_published FROM official_exams WHERE id = parent_id FOR UPDATE;
    IF parent_published IS NOT NULL THEN
        RAISE EXCEPTION 'Published official exam questions are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
SQL);
        Schema::dropIfExists('official_exam_question_changes');
    }
};
