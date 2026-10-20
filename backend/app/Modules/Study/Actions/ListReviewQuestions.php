<?php

namespace App\Modules\Study\Actions;

use App\Models\User;
use App\Modules\QuestionBank\QuestionExamMemberships;
use App\Modules\Study\ReviewQuestionSet;
use Illuminate\Contracts\Pagination\CursorPaginator;

// "incorrect" and "blank" use each question's latest graded outcome, so a question answered correctly later leaves the list.
class ListReviewQuestions
{
    public function __construct(private ResolveStudyContext $contexts) {}

    public function execute(User $actor, string $contextId, string $kind, int $perPage): CursorPaginator
    {
        $context = $this->contexts->execute($actor, $contextId);
        $page = ReviewQuestionSet::query($context->id, $kind)->with('publishedVersion.options', 'publishedVersion.source')->orderBy('id')->cursorPaginate($perPage)->withQueryString();
        QuestionExamMemberships::attach($page->getCollection());

        return $page;
    }
}
