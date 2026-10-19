<?php

namespace App\Modules\Study\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\QuestionExamMemberships;
use App\Modules\Study\AnswerEvents;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Support\Facades\DB;

// "incorrect" and "blank" use each question's latest graded outcome, so a question answered correctly later leaves the list.
class ListReviewQuestions
{
    public function __construct(private ResolveStudyContext $contexts) {}

    public function execute(User $actor, string $contextId, string $kind, int $perPage): CursorPaginator
    {
        $context = $this->contexts->execute($actor, $contextId);
        $query = Question::with('publishedVersion.options', 'publishedVersion.source')->whereNotNull('published_version_id');
        if ($kind === 'favorite') {
            $query->whereIn('id', DB::table('favorite_questions')->select('question_id')->where('study_context_id', $context->id));
        } else {
            $query->whereRaw(
                'id IN (SELECT question_id FROM (SELECT DISTINCT ON (question_id) question_id, outcome FROM ('.AnswerEvents::SQL.') events ORDER BY question_id, happened_at DESC) latest WHERE outcome = ?)',
                [...AnswerEvents::bindings($context->id), $kind],
            );
        }

        $page = $query->orderBy('id')->cursorPaginate($perPage)->withQueryString();
        QuestionExamMemberships::attach($page->getCollection());

        return $page;
    }
}
