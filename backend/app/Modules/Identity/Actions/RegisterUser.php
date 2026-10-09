<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Tenancy\Models\StudyContext;
use Illuminate\Auth\Events\Registered;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RegisterUser
{
    public function execute(array $attributes): User
    {
        try {
            $user = DB::transaction(function () use ($attributes) {
                $user = User::create($attributes);
                StudyContext::create(['user_id' => $user->id]);

                return $user;
            });
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages(['email' => ['Bu e-posta adresi zaten kullanılıyor.']]);
        }
        event(new Registered($user));

        return $user;
    }
}
