<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // The owner confirmed the existing archive is basic education. Adding the default does not
        // update published question versions, exam membership/order, answers or scoring history.
        DB::unprepared(<<<'SQL'
ALTER TABLE official_exams ADD COLUMN education_type varchar(10) NOT NULL DEFAULT 'basic';
ALTER TABLE official_exams ADD CONSTRAINT official_exam_education_type CHECK (education_type IN ('basic','renewal'));
DROP INDEX official_exams_identity_unique;
CREATE UNIQUE INDEX official_exams_identity_unique ON official_exams (exam_type_id, education_type, year, term, exam_number, weapon_status, subject_id) NULLS NOT DISTINCT;
CREATE INDEX official_exams_education ON official_exams (education_type, weapon_status, year) WHERE subject_id IS NULL;
CREATE OR REPLACE FUNCTION guard_exam_education() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE exam_id uuid; exam official_exams%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME = 'official_exams' THEN exam_id := NEW.id; ELSE exam_id := NEW.official_exam_id; END IF;
 SELECT * INTO exam FROM official_exams WHERE id=exam_id;
 IF exam.derived_from_id IS NOT NULL AND EXISTS (SELECT 1 FROM official_exams p WHERE p.id=exam.derived_from_id AND p.education_type<>exam.education_type) THEN
  RAISE EXCEPTION 'Linked exams must share their education type' USING ERRCODE='23514';
 END IF;
 IF EXISTS (SELECT 1 FROM official_exams c WHERE c.derived_from_id=exam.id AND c.education_type<>exam.education_type) THEN
  RAISE EXCEPTION 'Linked exams must share their education type' USING ERRCODE='23514';
 END IF;
 IF EXISTS (SELECT 1 FROM official_exam_scoring s JOIN scoring_periods p ON p.id=s.scoring_period_id WHERE s.official_exam_id=exam.id AND p.education_type<>exam.education_type) THEN
  RAISE EXCEPTION 'Scoring period must match the exam education type' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER official_exam_education_guard AFTER INSERT OR UPDATE ON official_exams DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION guard_exam_education();
CREATE CONSTRAINT TRIGGER official_exam_scoring_education_guard AFTER INSERT OR UPDATE ON official_exam_scoring DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION guard_exam_education();
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
DROP TRIGGER official_exam_scoring_education_guard ON official_exam_scoring;
DROP TRIGGER official_exam_education_guard ON official_exams;
DROP FUNCTION guard_exam_education();
DROP INDEX official_exams_education;
DROP INDEX official_exams_identity_unique;
ALTER TABLE official_exams DROP COLUMN education_type;
CREATE UNIQUE INDEX official_exams_identity_unique ON official_exams (exam_type_id, year, term, exam_number, weapon_status, subject_id) NULLS NOT DISTINCT;
SQL);
    }
};
