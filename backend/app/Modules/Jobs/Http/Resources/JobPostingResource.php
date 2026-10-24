<?php

namespace App\Modules\Jobs\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobPostingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $mine = $this->relationLoaded('applications') ? $this->applications->first() : null;

        return ['id' => $this->id, 'title' => $this->title, 'company_name' => $this->company_name, 'city' => $this->city, 'description' => $this->description, 'weapon_requirement' => $this->weapon_requirement, 'status' => $this->status, 'revision' => $this->revision, 'expires_at' => $this->expires_at?->toISOString(), 'is_open' => $this->isOpen(), 'created_at' => $this->created_at->toISOString(), 'application_id' => $mine?->id, 'application_status' => $mine?->status, 'applications_count' => $this->whenCounted('applications')];
    }
}
