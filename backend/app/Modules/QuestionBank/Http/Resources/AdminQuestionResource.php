<?php

namespace App\Modules\QuestionBank\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminQuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'revision' => $this->revision,
            'status' => $this->published_version_id === null ? 'draft' : 'published',
            'published_version_id' => $this->published_version_id,
            'has_pending_changes' => $this->published_version_id !== $this->latest_version_id,
            'latest_version' => new AdminQuestionVersionResource($this->latestVersion),
            'created_at' => $this->created_at->toISOString(), 'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
