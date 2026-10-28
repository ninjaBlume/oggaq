<?php

namespace App\Modules\Exams\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartRandomExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['required', 'uuid'],
            'education_type' => ['required', Rule::in(['basic', 'renewal'])],
            'weapon_status' => ['required', Rule::in(['armed', 'unarmed', 'weapon_difference'])],
            'duration_seconds' => ['required', 'integer', 'between:60,10800'],
            'timer_policy' => ['sometimes', Rule::in(['continuous', 'pause_on_exit'])],
            'question_count' => ['prohibited'], 'official_exam_id' => ['prohibited'], 'subject_id' => ['prohibited'], 'topic_id' => ['prohibited'],
            'user_id' => ['prohibited'], 'study_context_id' => ['prohibited'], 'tenant_id' => ['prohibited'],
            'random_reference_exam_id' => ['prohibited'], 'random_distribution' => ['prohibited'], 'random_scoring_period_id' => ['prohibited'],
        ];
    }
}
