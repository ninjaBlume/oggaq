<?php

namespace App\Modules\QuestionBank\Http\Requests;

use App\Modules\QuestionBank\Models\Question;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage', Question::class);
    }

    protected function prepareForValidation(): void
    {
        foreach (['stem', 'explanation'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim($this->input($field))]);
            }
        }
        if (is_array($this->input('options'))) {
            $this->merge(['options' => array_map(fn ($text) => is_string($text) ? trim($text) : $text, $this->input('options'))]);
        }
    }

    public function rules(): array
    {
        $subject = is_string($this->input('subject_id')) ? $this->input('subject_id') : null;

        return [
            'subject_id' => ['required', 'uuid', Rule::exists('subjects', 'id')],
            'topic_id' => ['nullable', 'uuid', Rule::exists('topics', 'id')->where('subject_id', $subject)],
            'exam_type_id' => ['nullable', 'uuid', Rule::exists('exam_types', 'id')],
            'source_id' => ['nullable', 'uuid', Rule::exists('question_sources', 'id')],
            'stem' => ['required', 'string', 'max:20000'], 'explanation' => ['nullable', 'string', 'max:20000'],
            'options' => ['present', 'array', 'list', 'max:10'],
            'options.*' => ['required', 'string', 'max:4000', 'distinct:ignore_case'],
            'correct_option_position' => ['nullable', 'integer', 'min:1', 'max:10'],
            'base_version' => [$this->isMethod('PATCH') ? 'required' : 'prohibited', 'integer', 'min:1'],
        ] + array_fill_keys(['id', 'user_id', 'tenant_id', 'created_by', 'revision', 'version', 'published_at', 'published_version_id', 'latest_version_id', 'correct_option_id', 'status'], ['prohibited']);
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if (! $validator->errors()->isEmpty()) {
                return;
            }
            $position = $this->input('correct_option_position');
            if ($position !== null && (int) $position > count($this->input('options'))) {
                $validator->errors()->add('correct_option_position', 'Doğru cevap mevcut bir seçeneğin sırası olmalıdır.');
            }
        }];
    }
}
