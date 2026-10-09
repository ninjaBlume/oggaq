<?php

namespace App\Modules\Exams\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['required', 'uuid'], 'question_count' => ['required', 'integer', 'min:1', 'max:100'],
            'duration_seconds' => ['required', 'integer', 'min:60', 'max:7200'],
            'subject_id' => ['nullable', 'required_with:topic_id', 'uuid', Rule::exists('subjects', 'id')],
            'topic_id' => ['nullable', 'uuid', Rule::exists('topics', 'id')->where('subject_id', $this->input('subject_id'))],
            'user_id' => ['prohibited'], 'tenant_id' => ['prohibited'], 'study_context_id' => ['prohibited'],
            'score_percent' => ['prohibited'], 'scoring_rule' => ['prohibited'], 'started_at' => ['prohibited'], 'deadline_at' => ['prohibited'],
        ];
    }
}
