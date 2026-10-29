<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Tenancy\Models\StudyContext;
use App\Support\PrivacyNotice;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RegisterUser
{
    public function execute(array $attributes): User
    {
        try {
            $user = DB::transaction(function () use ($attributes) {
                $user = User::create(collect($attributes)->only(['name', 'email', 'password'])->all());
                StudyContext::create(['user_id' => $user->id]);
                PrivacyNotice::record($user, 'registration', $attributes['privacy_notice_version'] ?? null);

                return $user;
            });
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages(['email' => ['Bu e-posta adresi zaten kullanılıyor.']]);
        }

        return $user;
    }
}
