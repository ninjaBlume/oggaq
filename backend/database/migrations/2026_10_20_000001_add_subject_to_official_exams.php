<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Exam types are Deneme (a whole exam) and Ders (one subject's questions of an exam number). A subject exam names its
// subject, so the identity of an exam now includes the subject; whole exams leave it empty.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE official_exams ADD COLUMN subject_id uuid NULL REFERENCES subjects(id) ON DELETE RESTRICT');
        DB::statement('DROP INDEX official_exams_identity_unique');
        DB::statement('CREATE UNIQUE INDEX official_exams_identity_unique ON official_exams (exam_type_id, year, term, exam_number, weapon_status, subject_id) NULLS NOT DISTINCT');
        DB::statement('CREATE INDEX official_exams_subject ON official_exams (subject_id, exam_type_id, year)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX official_exams_subject');
        DB::statement('DROP INDEX official_exams_identity_unique');
        DB::statement('ALTER TABLE official_exams DROP COLUMN subject_id');
        DB::statement('CREATE UNIQUE INDEX official_exams_identity_unique ON official_exams (exam_type_id, year, term, exam_number, weapon_status) NULLS NOT DISTINCT');
    }
};
