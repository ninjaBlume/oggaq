<?php

namespace App\Modules\Study;

use App\Modules\QuestionBank\Models\Question;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

// The questions a study context wants to go over again: the latest graded outcome is wrong ("incorrect") or empty
// ("blank"), or the student marked them as favorites. A question answered correctly later leaves the first two.
class ReviewQuestionSet
{
    public const KINDS = ['incorrect', 'blank', 'favorite'];

    /** @return Builder<Question> published questions of the set */
    public static function query(string $contextId, string $kind): Builder
    {
        $query = Question::whereNotNull('published_version_id');
        if ($kind === 'favorite') {
            return $query->whereIn('id', DB::table('favorite_questions')->select('question_id')->where('study_context_id', $contextId));
        }

        return $query->whereRaw(
            'id IN (SELECT question_id FROM (SELECT DISTINCT ON (question_id) question_id, outcome FROM ('.AnswerEvents::SQL.') events ORDER BY question_id, happened_at DESC) latest WHERE outcome = ?)',
            [...AnswerEvents::bindings($contextId), $kind],
        );
    }
}
