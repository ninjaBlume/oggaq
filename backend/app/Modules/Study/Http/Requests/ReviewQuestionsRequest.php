<?php

namespace App\Modules\Study\Http\Requests;

use App\Http\Requests\PaginationRequest;

class ReviewQuestionsRequest extends PaginationRequest
{
    public function rules(): array
    {
        return parent::rules() + ['kind' => ['required', 'string', 'in:incorrect,blank,favorite']];
    }
}
