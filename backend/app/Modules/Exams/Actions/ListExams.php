<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\Study\Actions\ResolveStudyContext;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Support\Facades\DB;

class ListExams
{
    public function __construct(private ResolveStudyContext $contexts, private FinalizeExam $finalize) {}

    public function execute(User $actor, string $contextId, int $perPage): CursorPaginator
    {
        $context = $this->contexts->execute($actor, $contextId);
        $page = ExamAttempt::where('study_context_id', $context->id)->orderByDesc('started_at')->orderByDesc('id')->cursorPaginate($perPage)->withQueryString();
        foreach ($page->items() as $item) {
            if ($item->finished_at === null && now()->greaterThanOrEqualTo($item->deadline_at)) {
                $fresh = DB::transaction(function () use ($item) {
                    $locked = ExamAttempt::whereKey($item->id)->lockForUpdate()->firstOrFail();

                    return $this->finalize->execute($locked);
                });
                $item->setRawAttributes($fresh->getAttributes(), true);
            }
        }

        return $page;
    }
}
