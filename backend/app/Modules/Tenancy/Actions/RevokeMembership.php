<?php

namespace App\Modules\Tenancy\Actions;

use App\Models\User;
use App\Modules\Tenancy\Models\Membership;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class RevokeMembership
{
    public function execute(User $actor, Tenant $tenant, string $membershipId): void
    {
        DB::transaction(function () use ($actor, $tenant, $membershipId) {
            $tenant = Tenant::whereKey($tenant->id)->lockForUpdate()->firstOrFail();
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('provision', $tenant);
            $membership = Membership::where('tenant_id', $tenant->id)->whereKey($membershipId)->lockForUpdate()->firstOrFail();
            if ($membership->status === 'active') {
                $membership->update(['status' => 'revoked', 'revoked_at' => now()]);
                DB::table('audit_events')->insert([
                    'id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => $tenant->id,
                    'target_id' => $membership->id, 'action' => 'membership.revoked', 'created_at' => now(),
                ]);
            }
        });
    }
}
