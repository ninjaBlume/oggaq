<?php

namespace App\Modules\Tenancy\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudyContextResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'kind' => $this->tenant_id === null ? 'personal' : 'tenant',
            'tenant_id' => $this->tenant_id, 'membership_id' => $this->membership_id,
            'name' => $this->tenant?->name ?? 'Kişisel çalışma', 'role' => $this->membership?->role,
        ];
    }
}
