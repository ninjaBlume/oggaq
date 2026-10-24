<?php

namespace App\Modules\Jobs\Actions;

use App\Models\User;

class JobsAccess
{
    public function lockActor(User $actor): User
    {
        $user = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
        abort_unless($user->status === 'active' && $user->hasVerifiedEmail(), 403);

        return $user;
    }
}
