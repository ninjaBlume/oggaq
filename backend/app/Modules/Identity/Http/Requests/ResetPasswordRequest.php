<?php

namespace App\Modules\Identity\Http\Requests;

class ResetPasswordRequest extends IdentityRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'token' => ['required', 'string', 'max:256'],
            'password' => $this->newPasswordRules(),
        ];
    }
}
