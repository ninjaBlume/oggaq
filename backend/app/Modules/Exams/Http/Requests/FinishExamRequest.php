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
        return ['base_version' => ['required', 'integer', 'min:1'], 'score_percent' => ['prohibited'], 'is_correct' => ['prohibited'], 'finished_at' => ['prohibited']];
    }
}
