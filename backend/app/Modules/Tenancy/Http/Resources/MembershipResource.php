<?php

namespace App\Modules\Tenancy\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MembershipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'tenant_id' => $this->tenant_id, 'user_id' => $this->user_id,
            'role' => $this->role, 'status' => $this->status,
            'joined_at' => $this->joined_at->toISOString(), 'revoked_at' => $this->revoked_at?->toISOString(),
            'user' => $this->whenLoaded('user', fn () => ['id' => $this->user->id, 'name' => $this->user->name, 'email' => $this->user->email]),
        ];
    }
}
