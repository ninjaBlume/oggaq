<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Timebox;

class AuthenticateUser
{
    public function execute(array $credentials): User
    {
        return (new Timebox)->call(function (Timebox $timebox) use ($credentials) {
            $user = User::where('email', $credentials['email'])->first();
            if (! $user || ! Hash::check($credentials['password'], $user->password) || $user->status !== 'active') {
                throw new ApiProblem(401, 'invalid_credentials', 'E-posta adresi veya parola hatalı.');
            }
            if (Hash::needsRehash($user->password)) {
                $user->forceFill(['password' => $credentials['password']])->save();
            }
            $timebox->returnEarly();

            return $user;
        }, 200000);
    }
}
