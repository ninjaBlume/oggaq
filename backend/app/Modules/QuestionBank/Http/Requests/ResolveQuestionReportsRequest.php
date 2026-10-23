<?php

namespace App\Modules\QuestionBank\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ResolveQuestionReportsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['status' => ['required', 'string', Rule::in(['fixed', 'dismissed'])], 'resolution_note' => ['nullable', 'string', 'max:500']];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('resolution_note'))) {
            $this->merge(['resolution_note' => trim($this->input('resolution_note')) === '' ? null : trim($this->input('resolution_note'))]);
        }
    }
}
