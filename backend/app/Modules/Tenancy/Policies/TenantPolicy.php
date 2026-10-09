<?php

namespace App\Modules\Tenancy\Policies;

use App\Models\User;
use App\Modules\Tenancy\Models\Tenant;

class TenantPolicy
{
    public function create(User $user): bool
    {
        return $user->isPlatformAdmin();
    }

    public function view(User $user, Tenant $tenant): bool
    {
        return $user->isPlatformAdmin() || ($user->status === 'active' && $tenant->status === 'active'
            && $tenant->memberships()->where('user_id', $user->id)->where('status', 'active')
                ->where('role', 'company_admin')->exists());
    }

    public function provision(User $user, Tenant $tenant): bool
    {
        return $user->isPlatformAdmin() && $tenant->status === 'active';
    }
}
