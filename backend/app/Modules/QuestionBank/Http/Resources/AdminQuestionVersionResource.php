<?php

namespace App\Modules\QuestionBank\Http\Resources;

use Illuminate\Http\Request;

class AdminQuestionVersionResource extends QuestionVersionResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'correct_option_id' => $this->correct_option_id, 'explanation' => $this->explanation,
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
