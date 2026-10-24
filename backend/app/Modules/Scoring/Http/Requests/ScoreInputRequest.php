<?php

namespace App\Modules\Scoring\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ScoreInputRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['id' => ['sometimes', 'uuid'], 'expected_rule_id' => ['sometimes', 'uuid'], 'period_id' => ['required', 'uuid', 'exists:scoring_periods,id'],
            'general_correct' => ['required', 'integer', 'between:0,200'], 'general_wrong' => ['required', 'integer', 'between:0,200'],
            'weapon_correct' => ['required', 'integer', 'between:0,200'], 'weapon_wrong' => ['required', 'integer', 'between:0,200'],
            'shooting_hits' => ['nullable', 'integer', 'between:0,20'], 'previous_general_score' => ['nullable', 'numeric', 'between:0,100', 'decimal:0,2']] + array_fill_keys(['user_id', 'scoring_rule_id', 'final_score', 'output', 'input', 'exam_attempt_id', 'revision'], ['prohibited']);
    }
}
