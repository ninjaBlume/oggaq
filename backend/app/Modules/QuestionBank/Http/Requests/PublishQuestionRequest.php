<?php

namespace App\Modules\QuestionBank\Http\Requests;

use App\Modules\QuestionBank\Models\Question;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class PublishQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage', Question::class);
    }

    public function rules(): array
    {
        return ['base_version' => ['required', 'integer', 'min:1']]
            + array_fill_keys(['tenant_id', 'version_id', 'published_at', 'published_version_id'], ['prohibited']);
    }
}
