<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Armed (125 questions) past exams exceed the first 100-question ceiling; the ceiling is now 200.
return new class extends Migration
{
    public function up(): void
    {
        $this->replace(200);
    }

    public function down(): void
    {
        $this->replace(100);
    }

    private function replace(int $limit): void
    {
        DB::statement('ALTER TABLE official_exam_questions DROP CONSTRAINT official_exam_position_valid');
        DB::statement("ALTER TABLE official_exam_questions ADD CONSTRAINT official_exam_position_valid CHECK (position BETWEEN 1 AND {$limit})");
        DB::statement('ALTER TABLE exam_answers DROP CONSTRAINT exam_answer_position_valid');
        DB::statement("ALTER TABLE exam_answers ADD CONSTRAINT exam_answer_position_valid CHECK (position BETWEEN 1 AND {$limit})");
        DB::statement('ALTER TABLE exam_attempts DROP CONSTRAINT exam_settings_valid');
        DB::statement("ALTER TABLE exam_attempts ADD CONSTRAINT exam_settings_valid CHECK (question_count BETWEEN 1 AND {$limit} AND duration_seconds BETWEEN 60 AND 7200 AND revision > 0 AND scoring_rule = 'correct_ratio_v1' AND deadline_at = started_at + duration_seconds * interval '1 second')");
    }
};
