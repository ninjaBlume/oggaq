<?php

namespace App\Modules\Exams\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveExamAnswerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('compact')) {
            $this->merge(['compact' => filter_var($this->input('compact'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)]);
        }
    }

    public function rules(): array
    {
        return [
            'compact' => ['sometimes', 'boolean'],
            'base_version' => ['required', 'integer', 'min:1'], 'selected_option_id' => ['present', 'nullable', 'uuid'],
            'is_correct' => ['prohibited'], 'user_id' => ['prohibited'], 'tenant_id' => ['prohibited'], 'score_percent' => ['prohibited'],
        ];
    }
}
