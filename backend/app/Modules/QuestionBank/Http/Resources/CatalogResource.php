<?php

namespace App\Modules\QuestionBank\Http\Resources;

use App\Modules\QuestionBank\Catalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CatalogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $result = ['id' => $this->id];
        foreach (Catalog::FIELDS[$request->route('catalog')] as $field) {
            $result[$field] = $this->{$field};
        }

        return $result;
    }
}
