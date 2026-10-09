<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_events', fn (Blueprint $table) => $table->uuid('tenant_id')->nullable()->change());
        foreach (['subjects', 'exam_types'] as $name) {
            Schema::create($name, function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('name', 160);
                $table->string('code', 80)->unique();
                $table->timestampsTz();
            });
        }
        Schema::create('topics', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('subject_id')->constrained()->restrictOnDelete();
            $table->uuid('parent_id')->nullable();
            $table->string('name', 160);
            $table->string('code', 80);
            $table->timestampsTz();
            $table->unique(['id', 'subject_id']);
            $table->unique(['subject_id', 'code']);
            $table->foreign(['parent_id', 'subject_id'])->references(['id', 'subject_id'])->on('topics')->restrictOnDelete();
            $table->index(['parent_id', 'subject_id']);
        });
        DB::statement('ALTER TABLE topics ADD CONSTRAINT topics_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id)');
        Schema::create('question_sources', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title', 240);
            $table->string('url', 2048)->nullable();
            $table->text('citation')->nullable();
            $table->timestampsTz();
        });
        Schema::create('questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('revision')->default(1);
            $table->uuid('latest_version_id')->nullable();
            $table->uuid('published_version_id')->nullable();
            $table->timestampsTz();
            $table->index('published_version_id');
        });
        Schema::create('question_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('question_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->foreignUuid('subject_id')->constrained()->restrictOnDelete();
            $table->uuid('topic_id')->nullable();
            $table->foreignUuid('exam_type_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignUuid('source_id')->nullable()->constrained('question_sources')->restrictOnDelete();
            $table->text('stem');
            $table->text('explanation')->nullable();
            $table->uuid('correct_option_id')->nullable();
            $table->timestampTz('published_at')->nullable();
            $table->timestampTz('created_at');
            $table->unique(['question_id', 'version']);
            $table->unique(['id', 'question_id']);
            $table->foreign(['topic_id', 'subject_id'])->references(['id', 'subject_id'])->on('topics')->restrictOnDelete();
            $table->index(['subject_id', 'topic_id']);
            $table->index('exam_type_id');
            $table->index('source_id');
        });
        Schema::create('question_options', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('question_version_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('position');
            $table->text('text');
            $table->unique(['question_version_id', 'position']);
            $table->unique(['id', 'question_version_id']);
        });
        DB::statement('ALTER TABLE questions ADD CONSTRAINT questions_revision_positive CHECK (revision > 0)');
        DB::statement('ALTER TABLE question_versions ADD CONSTRAINT question_version_valid CHECK (version > 0 AND length(trim(stem)) > 0 AND (published_at IS NULL OR (correct_option_id IS NOT NULL AND source_id IS NOT NULL)))');
        DB::statement('ALTER TABLE question_options ADD CONSTRAINT question_option_valid CHECK (position BETWEEN 1 AND 10 AND length(trim(text)) > 0)');
        Schema::table('question_versions', function (Blueprint $table) {
            $table->foreign(['correct_option_id', 'id'])->references(['id', 'question_version_id'])->on('question_options')->restrictOnDelete();
        });
        Schema::table('questions', function (Blueprint $table) {
            $table->foreign(['latest_version_id', 'id'])->references(['id', 'question_id'])->on('question_versions')->restrictOnDelete();
            $table->foreign(['published_version_id', 'id'])->references(['id', 'question_id'])->on('question_versions')->restrictOnDelete();
        });
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_published_question_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.published_at IS NOT NULL THEN
        RAISE EXCEPTION 'Published question versions are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NEW.published_at IS NOT NULL AND (SELECT count(*) FROM question_options WHERE question_version_id = NEW.id) < 2 THEN
        RAISE EXCEPTION 'Publication requires at least two options' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER guard_published_question_version BEFORE UPDATE OR DELETE ON question_versions
FOR EACH ROW EXECUTE FUNCTION guard_published_question_version();

CREATE OR REPLACE FUNCTION guard_published_question_option() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE version_id uuid;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        version_id := OLD.question_version_id;
        IF (SELECT published_at FROM question_versions WHERE id = version_id FOR UPDATE) IS NOT NULL THEN
            RAISE EXCEPTION 'Published options are immutable' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        version_id := NEW.question_version_id;
        IF (SELECT published_at FROM question_versions WHERE id = version_id FOR UPDATE) IS NOT NULL THEN
            RAISE EXCEPTION 'Published options are immutable' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
    END IF;
    RETURN OLD;
END $$;
CREATE TRIGGER guard_published_question_option BEFORE INSERT OR UPDATE OR DELETE ON question_options
FOR EACH ROW EXECUTE FUNCTION guard_published_question_option();

CREATE OR REPLACE FUNCTION guard_question_publication_pointer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.published_version_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM question_versions WHERE id = NEW.published_version_id AND published_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Public pointer must reference a published version' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER guard_question_publication_pointer BEFORE INSERT OR UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION guard_question_publication_pointer();
SQL);
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropForeign(['latest_version_id', 'id']);
            $table->dropForeign(['published_version_id', 'id']);
        });
        Schema::table('question_versions', fn (Blueprint $table) => $table->dropForeign(['correct_option_id', 'id']));
        Schema::dropIfExists('question_options');
        Schema::dropIfExists('question_versions');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('question_sources');
        Schema::dropIfExists('topics');
        Schema::dropIfExists('exam_types');
        Schema::dropIfExists('subjects');
        foreach (['guard_published_question_version', 'guard_published_question_option', 'guard_question_publication_pointer'] as $function) {
            DB::statement("DROP FUNCTION IF EXISTS {$function}()");
        }
        // Central audit events may exist; never discard them to restore NOT NULL.
    }
};
