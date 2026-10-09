<?php

namespace App\Modules\QuestionBank\Http\Requests;

use App\Http\Requests\PaginationRequest;
use Illuminate\Validation\Rule;

class QuestionListRequest extends PaginationRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'subject_id' => ['sometimes', 'uuid'], 'topic_id' => ['sometimes', 'uuid'],
            'exam_type_id' => ['sometimes', 'uuid'], 'source_id' => ['sometimes', 'uuid'],
            'status' => [$this->is('api/v1/admin/*') ? 'sometimes' : 'prohibited', Rule::in(['draft', 'published'])],
            'tenant_id' => ['prohibited'], 'include_answers' => ['prohibited'],
        ];
    }
}
