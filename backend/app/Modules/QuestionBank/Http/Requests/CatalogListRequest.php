<?php

namespace App\Modules\QuestionBank\Http\Requests;

use App\Http\Requests\PaginationRequest;

class CatalogListRequest extends PaginationRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->has('with_exam_counts')) {
            $this->merge(['with_exam_counts' => filter_var($this->input('with_exam_counts'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)]);
        }
    }

    public function rules(): array
    {
        return parent::rules() + ['subject_id' => ['sometimes', 'uuid'], 'tenant_id' => ['prohibited'], 'with_exam_counts' => [$this->route('catalog') === 'subjects' ? 'sometimes' : 'prohibited', 'boolean']];
    }
}
