<?php

namespace App\Modules\Study;

// One row per graded answer in a study context: answered practice attempts plus answers of finished exams (an exam without a single answer is abandoned and counts for nothing).
class AnswerEvents
{
    public const SQL = <<<'SQL'
SELECT p.question_id, p.question_version_id, p.answered_at AS happened_at,
    CASE WHEN p.selected_option_id IS NULL THEN 'blank' WHEN p.is_correct THEN 'correct' ELSE 'incorrect' END AS outcome
FROM practice_attempts p WHERE p.study_context_id = ? AND p.answered_at IS NOT NULL
UNION ALL
SELECT a.question_id, a.question_version_id, e.finished_at AS happened_at,
    CASE WHEN a.selected_option_id IS NULL THEN 'blank' WHEN a.is_correct THEN 'correct' ELSE 'incorrect' END AS outcome
FROM exam_answers a JOIN exam_attempts e ON e.id = a.exam_attempt_id
WHERE e.study_context_id = ? AND e.finished_at IS NOT NULL AND e.correct_count + e.incorrect_count > 0
SQL;

    public static function bindings(string $contextId): array
    {
        return [$contextId, $contextId];
    }
}
