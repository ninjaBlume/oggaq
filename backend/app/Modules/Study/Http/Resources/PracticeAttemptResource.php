<?php

namespace App\Modules\Study\Http\Resources;

use App\Modules\QuestionBank\Http\Resources\QuestionVersionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PracticeAttemptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $answered = $this->answered_at !== null;

        return [
            'id' => $this->id, 'context_id' => $this->study_context_id, 'question_id' => $this->question_id,
            'question' => new QuestionVersionResource($this->questionVersion),
            'created_at' => $this->created_at->toISOString(), 'answered_at' => $this->answered_at?->toISOString(),
            'selected_option_id' => $this->selected_option_id,
            'outcome' => ! $answered ? 'pending' : ($this->selected_option_id === null ? 'skipped' : ($this->is_correct ? 'correct' : 'incorrect')),
            'feedback' => $answered ? [
                'correct_option_id' => $this->questionVersion->correct_option_id,
                'explanation' => $this->questionVersion->explanation,
            ] : null,
        ];
    }
}
