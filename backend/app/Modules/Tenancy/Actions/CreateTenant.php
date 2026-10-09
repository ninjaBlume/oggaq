<?php

namespace App\Modules\Tenancy\Actions;

use App\Models\User;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class CreateTenant
{
    public function execute(User $actor, array $attributes): Tenant
    {
        return DB::transaction(function () use ($actor, $attributes) {
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('create', Tenant::class);
            $tenant = Tenant::create($attributes);
            DB::table('audit_events')->insert([
                'id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => $tenant->id,
                'target_id' => $tenant->id, 'action' => 'tenant.created', 'created_at' => now(),
            ]);

            return $tenant;
        });
    }
}
