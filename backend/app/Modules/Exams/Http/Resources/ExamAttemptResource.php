<?php

namespace App\Modules\Exams\Http\Resources;

use App\Modules\QuestionBank\Http\Resources\QuestionVersionResource;
use Illuminate\Http\Request;

class ExamAttemptResource extends ExamSummaryResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + ['questions' => $this->answers->map(fn ($answer) => [
            'id' => $answer->id, 'question_id' => $answer->question_id, 'position' => $answer->position,
            'question' => new QuestionVersionResource($answer->questionVersion), 'selected_option_id' => $answer->selected_option_id,
            'feedback' => $this->finished_at === null ? null : [
                'outcome' => $answer->selected_option_id === null ? 'skipped' : ($answer->is_correct ? 'correct' : 'incorrect'),
                'correct_option_id' => $answer->questionVersion->correct_option_id, 'explanation' => $answer->questionVersion->explanation,
            ],
        ])->all()];
    }
}
