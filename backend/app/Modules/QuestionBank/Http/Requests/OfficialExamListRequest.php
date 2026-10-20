<?php

namespace App\Modules\QuestionBank\Http\Requests;

use App\Http\Requests\PaginationRequest;

class OfficialExamListRequest extends PaginationRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'exam_type_id' => ['sometimes', 'uuid'], 'year' => ['sometimes', 'integer', 'between:1990,2200'],
            'term' => ['sometimes', 'string', 'max:80'], 'weapon_status' => ['sometimes', 'in:armed,unarmed'], 'subject_id' => ['sometimes', 'uuid'],
            'status' => [$this->is('api/v1/admin/*') ? 'sometimes' : 'prohibited', 'in:draft,published'],
        ];
    }
}
