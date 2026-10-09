<?php

namespace App\Modules\Exams\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveExamAnswerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'base_version' => ['required', 'integer', 'min:1'], 'selected_option_id' => ['present', 'nullable', 'uuid'],
            'is_correct' => ['prohibited'], 'user_id' => ['prohibited'], 'tenant_id' => ['prohibited'], 'score_percent' => ['prohibited'],
        ];
    }
}
