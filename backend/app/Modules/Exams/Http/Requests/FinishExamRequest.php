<?php

namespace App\Modules\Exams\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FinishExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['timer_session_id' => ['sometimes', 'nullable', 'uuid'], 'base_version' => ['required', 'integer', 'min:1'], 'score_percent' => ['prohibited'], 'is_correct' => ['prohibited'], 'finished_at' => ['prohibited']];
    }
}
