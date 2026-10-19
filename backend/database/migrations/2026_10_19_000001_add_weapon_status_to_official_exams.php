<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// The exam type is Temel or Yenileme; armed/unarmed is a separate attribute of the exam, not part of the type.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE official_exams ADD COLUMN weapon_status varchar(10) NULL');
        DB::statement("ALTER TABLE official_exams ADD CONSTRAINT official_exam_weapon_status CHECK (weapon_status IS NULL OR weapon_status IN ('armed', 'unarmed'))");
        DB::statement('DROP INDEX official_exams_identity_unique');
        DB::statement('CREATE UNIQUE INDEX official_exams_identity_unique ON official_exams (exam_type_id, year, term, exam_number, weapon_status) NULLS NOT DISTINCT');
        DB::statement('CREATE INDEX official_exams_filter ON official_exams (exam_type_id, weapon_status, year)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX official_exams_filter');
        DB::statement('DROP INDEX official_exams_identity_unique');
        DB::statement('ALTER TABLE official_exams DROP CONSTRAINT official_exam_weapon_status');
        DB::statement('ALTER TABLE official_exams DROP COLUMN weapon_status');
        DB::statement('CREATE UNIQUE INDEX official_exams_identity_unique ON official_exams (exam_type_id, year, term, exam_number) NULLS NOT DISTINCT');
    }
};
