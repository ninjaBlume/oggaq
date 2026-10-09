<?php

namespace App\Modules\QuestionBank\Policies;

use App\Models\User;

class QuestionPolicy
{
    public function manage(User $user): bool
    {
        return $user->isPlatformAdmin() && $user->hasVerifiedEmail();
    }
}
