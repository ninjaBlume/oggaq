<?php

namespace App\Modules\QuestionBank\Http\Requests;

use App\Http\Requests\PaginationRequest;
use Illuminate\Validation\Rule;

class QuestionReportListRequest extends PaginationRequest
{
    public function rules(): array
    {
        return parent::rules() + ['status' => ['sometimes', 'string', Rule::in(['open', 'fixed', 'dismissed'])]];
    }
}
