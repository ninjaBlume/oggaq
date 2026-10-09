<?php

namespace App\Modules\Tenancy\Policies;

use App\Models\User;
use App\Modules\Tenancy\Models\StudyContext;

class StudyContextPolicy
{
    public function view(User $user, StudyContext $context): bool
    {
        if ($user->status !== 'active' || $context->user_id !== $user->id) {
            return false;
        }

        return $context->tenant_id === null || ($context->tenant?->status === 'active'
            && $context->membership?->status === 'active');
    }
}
