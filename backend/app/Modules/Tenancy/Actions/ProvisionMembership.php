<?php

namespace App\Modules\Tenancy\Actions;

use App\Models\User;
use App\Modules\Tenancy\Models\Membership;
use App\Modules\Tenancy\Models\StudyContext;
use App\Modules\Tenancy\Models\Tenant;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class ProvisionMembership
{
    public function execute(User $actor, Tenant $tenant, array $attributes): Membership
    {
        return DB::transaction(function () use ($actor, $tenant, $attributes) {
            $tenant = Tenant::whereKey($tenant->id)->lockForUpdate()->firstOrFail();
            $users = User::whereIn('id', [$actor->id, $attributes['user_id']])->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $actor = $users->get($actor->id);
            $user = $users->get($attributes['user_id']);
            abort_unless($actor && $user, 404);
            Gate::forUser($actor)->authorize('provision', $tenant);
            if ($user->status !== 'active') {
                throw new ApiProblem(422, 'account_inactive', 'Üyelik için aktif bir kullanıcı gerekiyor.');
            }
            if ($tenant->memberships()->where('user_id', $user->id)->exists()) {
                throw new ApiProblem(409, 'membership_exists', 'Bu kullanıcının kurum üyeliği zaten mevcut.');
            }
            $membership = Membership::create([
                'tenant_id' => $tenant->id, 'user_id' => $user->id,
                'role' => $attributes['role'], 'status' => 'active', 'joined_at' => now(),
            ]);
            StudyContext::create(['user_id' => $user->id, 'tenant_id' => $tenant->id, 'membership_id' => $membership->id]);
            DB::table('audit_events')->insert([
                'id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => $tenant->id,
                'target_id' => $membership->id, 'action' => 'membership.created', 'created_at' => now(),
            ]);

            return $membership;
        });
    }
}
