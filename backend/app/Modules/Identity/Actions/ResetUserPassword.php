<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Support\ApiProblem;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class ResetUserPassword
{
    public function execute(array $credentials): void
    {
        $status = DB::transaction(function () use ($credentials) {
            DB::table('password_reset_tokens')->where('email', $credentials['email'])->lockForUpdate()->first();

            return Password::reset($credentials, function (User $user, string $password) {
                $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
                $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
                $user->tokens()->delete();
                DB::table('sessions')->where('user_id', $user->id)->delete();
                event(new PasswordReset($user));
            });
        });
        if ($status !== Password::PasswordReset) {
            throw new ApiProblem(422, 'invalid_reset_token', 'Parola sıfırlama bağlantısı geçersiz veya süresi dolmuş.');
        }
    }
}
