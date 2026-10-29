<?php

namespace App\Modules\Exams\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportOfflineExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['required', 'uuid'],
            'package_id' => ['required', 'regex:/\A[a-f0-9]{64}\z/'],
            'signature' => ['required', 'regex:/\A[a-f0-9]{64}\z/'],
            'claim' => ['required', 'array'], 'claim.version' => ['required', 'integer', 'in:1'],
            'claim.user_id' => ['required', 'uuid'], 'claim.context_id' => ['required', 'uuid'],
            'claim.official_exam_id' => ['required', 'uuid'], 'claim.content_hash' => ['required', 'regex:/\A[a-f0-9]{64}\z/'],
            'claim.scoring_period_id' => ['present', 'nullable', 'uuid'], 'claim.scoring_rule_id' => ['present', 'nullable', 'uuid'],
            'claim.questions' => ['required', 'array', 'min:1', 'max:200'],
            'claim.questions.*.question_id' => ['required', 'uuid'],
            'claim.questions.*.question_version_id' => ['required', 'uuid'], 'claim.questions.*.position' => ['required', 'integer', 'min:1', 'max:200'],
            'duration_seconds' => ['required', 'integer', 'min:60', 'max:10800'],
            'started_at' => ['required', 'date'], 'finished_at' => ['required', 'date', 'after_or_equal:started_at'],
            'elapsed_seconds' => ['required', 'integer', 'min:0', 'lte:duration_seconds'],
            'answers' => ['present', 'array', 'max:200'], 'answers.*' => ['required', 'uuid'],
            'score_percent' => ['prohibited'], 'user_id' => ['prohibited'], 'context_id' => ['prohibited'],
        ];
    }
}
