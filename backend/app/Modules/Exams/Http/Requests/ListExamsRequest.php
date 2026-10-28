<?php

namespace App\Modules\Exams\Http\Requests;

use App\Http\Requests\PaginationRequest;
use Illuminate\Validation\Rule;

class ListExamsRequest extends PaginationRequest
{
    public function rules(): array
    {
        return parent::rules() + ['scope' => ['sometimes', Rule::in(['exams', 'review', 'all'])]];
    }
}
