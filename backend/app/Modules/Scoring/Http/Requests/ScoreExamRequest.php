<?php

namespace App\Modules\Scoring\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ScoreExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['id' => ['required', 'uuid'], 'shooting_hits' => ['nullable', 'integer', 'between:0,20'], 'previous_general_score' => ['nullable', 'numeric', 'between:0,100', 'decimal:0,2']] + array_fill_keys(['general_correct', 'general_wrong', 'weapon_correct', 'weapon_wrong', 'period_id', 'scoring_rule_id', 'final_score', 'user_id'], ['prohibited']);
    }
}
