<?php

namespace App\Modules\Study\Actions;

use App\Models\User;
use App\Modules\Tenancy\Models\Membership;
use App\Modules\Tenancy\Models\StudyContext;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ResolveStudyContext
{
    public function execute(User $actor, string $id, bool $lock = false): StudyContext
    {
        $context = StudyContext::where('user_id', $actor->id)->with(['tenant', 'membership'])->findOrFail($id);
        if ($lock) {
            if (DB::transactionLevel() === 0) {
                throw new \LogicException('Locked context resolution requires a transaction.');
            }
            // Match tenancy mutation order: tenant, user, membership, then owned rows.
            if ($context->tenant_id !== null) {
                $context->setRelation('tenant', Tenant::whereKey($context->tenant_id)->lockForUpdate()->firstOrFail());
            }
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            if ($context->membership_id !== null) {
                $context->setRelation('membership', Membership::whereKey($context->membership_id)->lockForUpdate()->firstOrFail());
            }
        }
        Gate::forUser($actor)->authorize('view', $context);

        return $context;
    }
}
