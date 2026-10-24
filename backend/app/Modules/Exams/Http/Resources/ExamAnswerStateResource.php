<?php

namespace App\Modules\Exams\Http\Resources;

use Illuminate\Http\Request;

// All canonical selections, without resending immutable question text/options after every answer.
class ExamAnswerStateResource extends ExamSummaryResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + ['answers' => $this->answers->map(fn ($answer) => [
            'id' => $answer->id, 'selected_option_id' => $answer->selected_option_id,
        ])->all()];
    }
}
