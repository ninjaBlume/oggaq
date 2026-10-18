<?php

namespace App\Modules\Study\Actions;

use App\Models\User;
use App\Modules\Study\AnswerEvents;
use Illuminate\Support\Facades\DB;

// Every graded answer counts: repeated attempts of a question are separate answers, blanks are not correct.
class BuildStudyStats
{
    public function __construct(private ResolveStudyContext $contexts) {}

    public function execute(User $actor, string $contextId): array
    {
        $context = $this->contexts->execute($actor, $contextId);
        $rows = DB::select(
            "SELECT s.id AS subject_id, s.name,
                count(*) FILTER (WHERE events.outcome = 'correct') AS correct,
                count(*) FILTER (WHERE events.outcome = 'incorrect') AS incorrect,
                count(*) FILTER (WHERE events.outcome = 'blank') AS blank
            FROM (".AnswerEvents::SQL.') events
            JOIN question_versions v ON v.id = events.question_version_id
            JOIN subjects s ON s.id = v.subject_id
            GROUP BY s.id, s.name ORDER BY s.name, s.id',
            AnswerEvents::bindings($context->id),
        );
        $subjects = array_map(fn ($row) => ['subject_id' => $row->subject_id, 'name' => $row->name] + $this->counts((int) $row->correct, (int) $row->incorrect, (int) $row->blank), $rows);
        $sum = fn (string $key) => array_sum(array_column($subjects, $key));
        $exams = DB::selectOne('SELECT count(*) AS completed, avg(score_percent) AS average, max(score_percent) AS best FROM exam_attempts WHERE study_context_id = ? AND finished_at IS NOT NULL', [$context->id]);

        return [
            'answers' => $this->counts($sum('correct'), $sum('incorrect'), $sum('blank')),
            'exams' => [
                'completed' => (int) $exams->completed,
                'average_score_percent' => $exams->average === null ? null : round((float) $exams->average, 2),
                'best_score_percent' => $exams->best === null ? null : round((float) $exams->best, 2),
            ],
            'subjects' => $subjects,
        ];
    }

    private function counts(int $correct, int $incorrect, int $blank): array
    {
        $total = $correct + $incorrect + $blank;

        return [
            'correct' => $correct, 'incorrect' => $incorrect, 'blank' => $blank, 'total' => $total,
            'accuracy_percent' => $total === 0 ? null : round($correct * 100 / $total, 2),
        ];
    }
}
