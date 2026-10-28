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
            $table->string('random_education_type', 16)->nullable();
            $table->string('random_weapon_status', 24)->nullable();
            $table->foreignUuid('random_reference_exam_id')->nullable()->constrained('official_exams')->restrictOnDelete();
            $table->jsonb('random_distribution')->nullable();
            $table->foreignUuid('random_scoring_period_id')->nullable()->constrained('scoring_periods')->restrictOnDelete();
            $table->index('random_reference_exam_id');
            $table->index('random_scoring_period_id');
        });
        DB::unprepared(<<<'SQL'
ALTER TABLE exam_attempts ADD CONSTRAINT random_exam_configuration_valid CHECK (
    (random_education_type IS NULL AND random_weapon_status IS NULL AND random_reference_exam_id IS NULL AND random_distribution IS NULL AND random_scoring_period_id IS NULL)
    OR (random_education_type IS NOT NULL AND random_education_type IN ('basic','renewal')
        AND random_weapon_status IS NOT NULL AND random_weapon_status IN ('armed','unarmed','weapon_difference')
        AND random_reference_exam_id IS NOT NULL AND random_distribution IS NOT NULL AND jsonb_typeof(random_distribution) = 'array'
        AND official_exam_id IS NULL AND subject_id IS NULL AND topic_id IS NULL
        AND question_count = CASE random_weapon_status WHEN 'armed' THEN 125 WHEN 'unarmed' THEN 100 ELSE 25 END)
);
CREATE UNIQUE INDEX exam_one_active_random_per_context ON exam_attempts (study_context_id)
    WHERE random_weapon_status IS NOT NULL AND finished_at IS NULL;
CREATE OR REPLACE FUNCTION guard_random_exam_configuration() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE reference record; scoring record;
BEGIN
    IF TG_OP = 'UPDATE' AND ROW(NEW.random_education_type, NEW.random_weapon_status, NEW.random_reference_exam_id, NEW.random_distribution, NEW.random_scoring_period_id)
        IS DISTINCT FROM ROW(OLD.random_education_type, OLD.random_weapon_status, OLD.random_reference_exam_id, OLD.random_distribution, OLD.random_scoring_period_id) THEN
        RAISE EXCEPTION 'Random exam configuration is immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'INSERT' AND NEW.random_weapon_status IS NOT NULL THEN
        SELECT education_type, weapon_status, subject_id, published_at, (SELECT count(*) FROM official_exam_questions WHERE official_exam_id = official_exams.id) AS question_count INTO reference FROM official_exams WHERE id = NEW.random_reference_exam_id;
        IF reference.education_type IS DISTINCT FROM NEW.random_education_type OR reference.weapon_status IS DISTINCT FROM 'armed'
            OR reference.subject_id IS NOT NULL OR reference.published_at IS NULL OR reference.question_count <> 125 THEN
            RAISE EXCEPTION 'Random exam requires a matching published full reference' USING ERRCODE = '23514';
        END IF;
        IF NEW.random_scoring_period_id IS NOT NULL THEN
            SELECT p.education_type, p.weapon_status, r.configuration, r.published_at INTO scoring
                FROM scoring_periods p JOIN scoring_rules r ON r.id = p.scoring_rule_id WHERE p.id = NEW.random_scoring_period_id;
            IF scoring.published_at IS NULL OR scoring.education_type IS DISTINCT FROM
                (CASE WHEN NEW.random_weapon_status = 'weapon_difference' THEN 'weapon_difference' ELSE NEW.random_education_type END)
                OR scoring.weapon_status IS DISTINCT FROM (CASE WHEN NEW.random_weapon_status = 'unarmed' THEN 'unarmed' ELSE 'armed' END)
                OR (scoring.configuration->>'general_count')::int <> (CASE WHEN NEW.random_weapon_status = 'weapon_difference' THEN 0 ELSE 100 END)
                OR (scoring.configuration->>'weapon_count')::int <> (CASE WHEN NEW.random_weapon_status = 'unarmed' THEN 0 ELSE 25 END) THEN
                RAISE EXCEPTION 'Random scoring must match its education and sections' USING ERRCODE = '23514';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER guard_random_exam BEFORE INSERT OR UPDATE ON exam_attempts FOR EACH ROW EXECUTE FUNCTION guard_random_exam_configuration();
SQL);
    }

    public function down(): void
    {
        if (DB::table('exam_attempts')->whereNotNull('random_weapon_status')->exists()) {
            throw new RuntimeException('Rastgele sınav geçmişi varken bu migration geri alınamaz.');
        }
        DB::unprepared('DROP TRIGGER guard_random_exam ON exam_attempts; DROP FUNCTION guard_random_exam_configuration(); DROP INDEX exam_one_active_random_per_context; ALTER TABLE exam_attempts DROP CONSTRAINT random_exam_configuration_valid;');
        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('random_reference_exam_id');
            $table->dropConstrainedForeignId('random_scoring_period_id');
            $table->dropColumn(['random_education_type', 'random_weapon_status', 'random_distribution']);
        });
    }
};
