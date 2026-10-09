<?php

namespace App\Modules\QuestionBank\Http\Requests;

use App\Modules\QuestionBank\Catalog;
use App\Modules\QuestionBank\Models\Question;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CreateCatalogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage', Question::class);
    }

    protected function prepareForValidation(): void
    {
        foreach (['name', 'code', 'title', 'url', 'citation'] as $key) {
            if (is_string($this->input($key))) {
                $this->merge([$key => trim($this->input($key))]);
            }
        }
    }

    public function rules(): array
    {
        $catalog = $this->route('catalog');
        $rules = array_fill_keys(['id', 'tenant_id', 'created_by', 'published_at', 'status'], ['prohibited']);
        if ($catalog === 'question-sources') {
            return $rules + [
                'title' => ['required', 'string', 'max:240'],
                'url' => ['nullable', 'url:http,https', 'max:2048'],
                'citation' => ['nullable', 'string', 'max:4000'],
            ];
        }
        $rules += ['name' => ['required', 'string', 'max:160'], 'code' => ['required', 'string', 'max:80', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/']];
        if ($catalog === 'topics') {
            $rules['subject_id'] = ['required', 'uuid', Rule::exists('subjects', 'id')];
            $subject = is_string($this->input('subject_id')) ? $this->input('subject_id') : null;
            $rules['parent_id'] = ['nullable', 'uuid', Rule::exists('topics', 'id')->where('subject_id', $subject)];
        } else {
            $rules['code'][] = Rule::unique(Catalog::MODELS[$catalog], 'code');
        }

        return $rules;
    }
}
