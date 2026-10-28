<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Support\ApiProblem;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Support\Facades\Schema;

// Read-only: expired attempts are closed by `exams:expire` or by opening the attempt, never by listing.
class ListExams
{
    public function __construct(private ResolveStudyContext $contexts) {}

    public function execute(User $actor, string $contextId, int $perPage, string $scope = 'exams'): CursorPaginator
    {
        $context = $this->contexts->execute($actor, $contextId);

        $query = ExamAttempt::notAbandoned()->where('study_context_id', $context->id);
        if ($scope === 'exams') {
            $query->withoutReviews();
        } elseif ($scope === 'review') {
            if (! Schema::hasColumn('exam_attempts', 'review_kind')) {
                throw new ApiProblem(503, 'review_unavailable', 'Tekrar geçmişi için sunucu güncellemesi gerekiyor.');
            }
            $query->whereNotNull('review_kind');
        }

        return $query->orderByDesc('started_at')->orderByDesc('id')->cursorPaginate($perPage)->withQueryString();
    }
}
