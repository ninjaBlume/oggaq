<?php

namespace App\Modules\Jobs\Policies;

use App\Models\User;

class JobPostingPolicy
{
    public function manage(User $user): bool
    {
        return $user->isPlatformAdmin() && $user->hasVerifiedEmail();
    }
}
