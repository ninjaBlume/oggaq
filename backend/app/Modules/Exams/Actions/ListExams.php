<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\Study\Actions\ResolveStudyContext;
use Illuminate\Contracts\Pagination\CursorPaginator;

// Read-only: expired attempts are closed by `exams:expire` or by opening the attempt, never by listing.
class ListExams
{
    public function __construct(private ResolveStudyContext $contexts) {}

    public function execute(User $actor, string $contextId, int $perPage): CursorPaginator
    {
        $context = $this->contexts->execute($actor, $contextId);

        return ExamAttempt::notAbandoned()->where('study_context_id', $context->id)->orderByDesc('started_at')->orderByDesc('id')->cursorPaginate($perPage)->withQueryString();
    }
}
