<?php

namespace App\Modules\Identity\Http\Requests;

class LoginRequest extends IdentityRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'password' => ['required', 'string', 'max:128'],
        ];
    }
}
