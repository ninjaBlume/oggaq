<?php

namespace App\Modules\QuestionBank\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'version' => new QuestionVersionResource($this->publishedVersion)];
    }
}
