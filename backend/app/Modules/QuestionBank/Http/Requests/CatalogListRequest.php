<?php

namespace App\Modules\QuestionBank\Http\Requests;

use App\Http\Requests\PaginationRequest;

class CatalogListRequest extends PaginationRequest
{
    public function rules(): array
    {
        return parent::rules() + ['subject_id' => ['sometimes', 'uuid'], 'tenant_id' => ['prohibited']];
    }
}
