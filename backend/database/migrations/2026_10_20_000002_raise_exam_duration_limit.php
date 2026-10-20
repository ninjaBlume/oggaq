<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// EGM exam instruction 4.3: armed exams (125 questions) last 150 minutes, unarmed 120, the weapon-difference exam 30.
// The first ceiling of two hours could not hold a full armed past exam; the ceiling is now three hours.
return new class extends Migration
{
    public function up(): void
    {
        $this->replace(10800);
    }

    public function down(): void
    {
        $this->replace(7200);
    }

    private function replace(int $seconds): void
    {
        DB::statement('ALTER TABLE exam_attempts DROP CONSTRAINT exam_settings_valid');
        DB::statement("ALTER TABLE exam_attempts ADD CONSTRAINT exam_settings_valid CHECK (question_count BETWEEN 1 AND 200 AND duration_seconds BETWEEN 60 AND {$seconds} AND revision > 0 AND scoring_rule = 'correct_ratio_v1' AND deadline_at = started_at + duration_seconds * interval '1 second')");
    }
};
