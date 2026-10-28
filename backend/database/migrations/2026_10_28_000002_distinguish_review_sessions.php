<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_attempts', fn (Blueprint $table) => $table->string('review_kind', 16)->nullable());
        DB::unprepared(<<<'SQL'
ALTER TABLE exam_attempts ADD CONSTRAINT exam_review_kind_valid CHECK (
    review_kind IS NULL OR (review_kind IN ('incorrect', 'blank', 'favorite') AND official_exam_id IS NULL AND random_weapon_status IS NULL)
);
CREATE INDEX review_context_history ON exam_attempts (study_context_id, started_at DESC, id DESC) WHERE review_kind IS NOT NULL;
CREATE OR REPLACE FUNCTION guard_exam_review_kind() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.review_kind IS DISTINCT FROM OLD.review_kind THEN
        RAISE EXCEPTION 'Review kind is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER guard_exam_review_kind BEFORE UPDATE ON exam_attempts FOR EACH ROW EXECUTE FUNCTION guard_exam_review_kind();
SQL);
    }

    public function down(): void
    {
        if (DB::table('exam_attempts')->whereNotNull('review_kind')->exists()) {
            throw new RuntimeException('Tekrar geçmişi varken tür ayrımı geri alınamaz.');
        }
        DB::unprepared('DROP TRIGGER guard_exam_review_kind ON exam_attempts; DROP FUNCTION guard_exam_review_kind(); DROP INDEX review_context_history; ALTER TABLE exam_attempts DROP CONSTRAINT exam_review_kind_valid;');
        Schema::table('exam_attempts', fn (Blueprint $table) => $table->dropColumn('review_kind'));
    }
};
