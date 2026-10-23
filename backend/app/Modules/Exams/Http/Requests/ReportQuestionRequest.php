<?php

namespace App\Modules\Exams\Http\Requests;

use App\Modules\QuestionBank\Models\QuestionReport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', Rule::in(QuestionReport::REASONS)],
            'note' => ['nullable', 'string', 'max:500'],
            'user_id' => ['prohibited'], 'question_id' => ['prohibited'], 'status' => ['prohibited'],
        ];
    }

    // Whitespace-only notes are no notes.
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('note'))) {
            $this->merge(['note' => trim($this->input('note')) === '' ? null : trim($this->input('note'))]);
        }
    }
}
