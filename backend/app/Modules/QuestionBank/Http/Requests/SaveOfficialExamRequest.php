<?php

namespace App\Modules\QuestionBank\Http\Requests;

use App\Modules\QuestionBank\Models\Question;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SaveOfficialExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage', Question::class);
    }

    public function rules(): array
    {
        return [
            'exam_type_id' => ['required', 'uuid', Rule::exists('exam_types', 'id')],
            'source_id' => ['nullable', 'uuid', Rule::exists('question_sources', 'id')],
            'title' => ['required', 'string', 'max:240'],
            'year' => ['required', 'integer', 'between:1990,2200'],
            'term' => ['nullable', 'string', 'max:80'], 'exam_number' => ['nullable', 'string', 'max:40'],
            'question_version_ids' => ['required', 'array', 'list', 'min:1', 'max:200'],
            'question_version_ids.*' => ['required', 'uuid', 'distinct', Rule::exists('question_versions', 'id')->whereNotNull('published_at')],
        ] + array_fill_keys(['id', 'created_by', 'published_at', 'status', 'question_count'], ['prohibited']);
    }
}
