<?php

namespace App\Modules\Exams\Http\Resources;

use App\Modules\QuestionBank\Http\Resources\QuestionVersionResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamAttemptResource extends ExamSummaryResource
{
    public function toArray(Request $request): array
    {
        // One lookup flags the attempt's questions that are favorites in this study context.
        $favorites = array_flip(DB::table('favorite_questions')->where('study_context_id', $this->study_context_id)
            ->whereIn('question_id', $this->answers->pluck('question_id'))->pluck('question_id')->all());

        return parent::toArray($request) + ['questions' => $this->answers->map(fn ($answer) => [
            'id' => $answer->id, 'question_id' => $answer->question_id, 'position' => $answer->position,
            'question' => new QuestionVersionResource($answer->questionVersion), 'selected_option_id' => $answer->selected_option_id,
            'is_favorite' => isset($favorites[$answer->question_id]),
            'feedback' => $this->finished_at === null ? null : [
                'outcome' => $answer->selected_option_id === null ? 'skipped' : ($answer->is_correct ? 'correct' : 'incorrect'),
                'correct_option_id' => $answer->questionVersion->correct_option_id, 'explanation' => $answer->questionVersion->explanation,
            ],
        ])->all()];
    }
}
