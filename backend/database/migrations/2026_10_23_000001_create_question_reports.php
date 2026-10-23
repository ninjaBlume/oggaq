<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A student's report about a question seen in a finished exam. It pins the exact version the student saw, so it
        // stays meaningful after the question is corrected. The reporter is nullable: deleting an account keeps the
        // report (it is about the question, not the person) but severs the link.
        Schema::create('question_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('question_id')->constrained('questions')->restrictOnDelete();
            $table->foreignUuid('question_version_id')->constrained('question_versions')->restrictOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('exam_attempt_id')->nullable()->constrained('exam_attempts')->nullOnDelete();
            $table->string('reason', 30);
            $table->text('note')->nullable();
            $table->string('status', 10)->default('open');
            $table->foreignUuid('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('resolved_at')->nullable();
            $table->text('resolution_note')->nullable();
            $table->timestampTz('created_at');
            $table->index(['status', 'question_id']);
            $table->index(['question_id', 'created_at']);
        });
        DB::statement("ALTER TABLE question_reports ADD CONSTRAINT question_report_reason CHECK (reason IN ('wrong_answer_key', 'typo', 'unclear', 'outdated', 'other'))");
        DB::statement("ALTER TABLE question_reports ADD CONSTRAINT question_report_status CHECK (status IN ('open', 'fixed', 'dismissed'))");
        DB::statement('ALTER TABLE question_reports ADD CONSTRAINT question_report_notes CHECK (char_length(note) <= 500 AND char_length(resolution_note) <= 500)');
        DB::statement("ALTER TABLE question_reports ADD CONSTRAINT question_report_resolution CHECK ((status = 'open') = (resolved_at IS NULL))");
        // One open report per student and question: repeating a report is the same report.
        DB::statement("CREATE UNIQUE INDEX question_reports_one_open ON question_reports (user_id, question_id) WHERE status = 'open'");
        // What the student wrote and which version they saw never change; only a resolution may be added, once.
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
        DB::statement('CREATE TRIGGER guard_question_report BEFORE UPDATE ON question_reports FOR EACH ROW EXECUTE FUNCTION guard_question_report()');
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS guard_question_report ON question_reports');
        DB::statement('DROP FUNCTION IF EXISTS guard_question_report()');
        Schema::dropIfExists('question_reports');
    }
};
