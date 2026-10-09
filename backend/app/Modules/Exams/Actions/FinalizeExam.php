<?php

namespace App\Modules\Exams\Actions;

use App\Modules\Exams\Models\ExamAttempt;
use Illuminate\Support\Facades\DB;

class FinalizeExam
{
    // Caller must hold this attempt's row lock inside a transaction.
    public function execute(ExamAttempt $attempt): ExamAttempt
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('Exam finalization requires a transaction and row lock.');
        }
        if ($attempt->finished_at !== null) {
            return $attempt;
        }
        $currentTime = now()->startOfSecond();
        $expired = $currentTime->greaterThanOrEqualTo($attempt->deadline_at);
        $finishedAt = $expired ? $attempt->deadline_at : $currentTime;
        DB::update('UPDATE exam_answers a SET is_correct = (a.selected_option_id IS NOT NULL AND a.selected_option_id = v.correct_option_id) FROM question_versions v WHERE a.exam_attempt_id = ? AND v.id = a.question_version_id', [$attempt->id]);
        $counts = DB::table('exam_answers')->where('exam_attempt_id', $attempt->id)->selectRaw('count(*) FILTER (WHERE is_correct = true) AS correct, count(*) FILTER (WHERE selected_option_id IS NOT NULL AND is_correct = false) AS incorrect, count(*) FILTER (WHERE selected_option_id IS NULL) AS blank')->first();
        $attempt->forceFill([
            'finished_at' => $finishedAt, 'finish_reason' => $expired ? 'expired' : 'manual',
            'correct_count' => (int) $counts->correct, 'incorrect_count' => (int) $counts->incorrect,
            'blank_count' => (int) $counts->blank,
            'score_percent' => round($counts->correct * 100 / $attempt->question_count, 2),
            'revision' => $attempt->revision + 1,
        ])->save();
        $attempt->unsetRelation('answers');

        return $attempt;
    }
}
