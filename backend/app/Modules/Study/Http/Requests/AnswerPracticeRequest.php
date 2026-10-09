<?php

namespace App\Modules\Study\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AnswerPracticeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'selected_option_id' => ['present', 'nullable', 'uuid'],
            'user_id' => ['prohibited'], 'study_context_id' => ['prohibited'], 'tenant_id' => ['prohibited'],
            'question_id' => ['prohibited'], 'question_version_id' => ['prohibited'], 'is_correct' => ['prohibited'],
            'answered_at' => ['prohibited'], 'correct_option_id' => ['prohibited'], 'score' => ['prohibited'],
        ];
    }
}
