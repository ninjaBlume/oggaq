<?php

namespace App\Modules\Identity\Http\Requests;

use Closure;
use Illuminate\Support\Facades\Hash;

// An account-changing request proves the actor still knows the password (a stolen session or token is not enough).
abstract class AccountRequest extends IdentityRequest
{
    protected function currentPasswordRules(): array
    {
        return ['required', 'string', 'max:128', function (string $attribute, mixed $value, Closure $fail) {
            if (! is_string($value) || ! Hash::check($value, (string) $this->user()?->password)) {
                $fail('Mevcut parola hatalı.');
            }
        }];
    }
}
