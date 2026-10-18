<?php

namespace App\Modules\Study\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\Question;
use Illuminate\Support\Facades\DB;

class SetFavoriteQuestion
{
    public function __construct(private ResolveStudyContext $contexts) {}

    // Idempotent: repeating the same state changes nothing.
    public function execute(User $actor, string $contextId, string $questionId, bool $favorite): void
    {
        DB::transaction(function () use ($actor, $contextId, $questionId, $favorite) {
            $context = $this->contexts->execute($actor, $contextId, true);
            if ($favorite) {
                Question::whereNotNull('published_version_id')->findOrFail($questionId);
                DB::table('favorite_questions')->insertOrIgnore(['study_context_id' => $context->id, 'question_id' => $questionId, 'created_at' => now()]);
            } else {
                DB::table('favorite_questions')->where('study_context_id', $context->id)->where('question_id', $questionId)->delete();
            }
        });
    }
}
