<?php

namespace App\Modules\Exams\Http\Requests;

use App\Modules\Study\ReviewQuestionSet;
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
            'id' => ['required', 'uuid'], 'question_count' => ['required_without:official_exam_id', 'integer', 'min:1', 'max:100'],
            // A past exam fixes its own questions, order and count, so random-selection settings cannot accompany it.
            'official_exam_id' => ['sometimes', 'uuid', 'prohibits:question_count,subject_id,topic_id,review_kind', Rule::exists('official_exams', 'id')->whereNotNull('published_at')],
            'review_kind' => ['sometimes', Rule::in(ReviewQuestionSet::KINDS)],
            'duration_seconds' => ['required', 'integer', 'min:60', 'max:10800'],
            'subject_id' => ['nullable', 'required_with:topic_id', 'uuid', Rule::exists('subjects', 'id')],
            'topic_id' => ['nullable', 'uuid', Rule::exists('topics', 'id')->where('subject_id', $this->input('subject_id'))],
            'user_id' => ['prohibited'], 'tenant_id' => ['prohibited'], 'study_context_id' => ['prohibited'],
            'score_percent' => ['prohibited'], 'scoring_rule' => ['prohibited'], 'started_at' => ['prohibited'], 'deadline_at' => ['prohibited'],
        ];
    }
}
