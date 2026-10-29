<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

class ListOfflineExamRevisions
{
    public function execute(User $actor, string $contextId): array
    {
        $context = app(ResolveStudyContext::class)->execute($actor, $contextId);
        if ($context->tenant_id !== null || $context->membership_id !== null) {
            throw new ApiProblem(403, 'offline_personal_only', 'Çevrimdışı sınavlar yalnız kişisel kullanım için hazırlanabilir.');
        }
        $rows = DB::table('official_exams as e')
            ->leftJoin('official_exam_questions as q', 'q.official_exam_id', '=', 'e.id')
            ->leftJoin('official_exam_scoring as s', 's.official_exam_id', '=', 'e.id')
            ->leftJoin('scoring_periods as p', 'p.id', '=', 's.scoring_period_id')
            ->whereNotNull('e.published_at')
            ->selectRaw("e.id, s.scoring_period_id, p.scoring_rule_id, COALESCE(string_agg(q.position::text || ':' || q.question_id::text || ':' || q.question_version_id::text, ',' ORDER BY q.position), '') AS versions")
            ->groupBy('e.id', 's.scoring_period_id', 'p.scoring_rule_id')->get();

        return $rows->map(fn ($row) => ['exam_id' => $row->id, 'revision' => hash('sha256', ($row->scoring_period_id ?? '').':'.($row->scoring_rule_id ?? '').'|'.$row->versions)])->all();
    }
}
