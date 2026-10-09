<?php

namespace App\Modules\Study\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartPracticeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['required', 'uuid'], 'question_id' => ['required', 'uuid'], 'question_version_id' => ['required', 'uuid'],
            'user_id' => ['prohibited'], 'study_context_id' => ['prohibited'], 'tenant_id' => ['prohibited'],
            'is_correct' => ['prohibited'], 'answered_at' => ['prohibited'], 'selected_option_id' => ['prohibited'],
        ];
    }
}
