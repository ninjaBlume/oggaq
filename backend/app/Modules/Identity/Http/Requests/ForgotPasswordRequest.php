<?php

namespace App\Modules\Identity\Http\Requests;

class ForgotPasswordRequest extends IdentityRequest
{
    public function rules(): array
    {
        return ['email' => ['required', 'string', 'email:rfc', 'max:254']];
    }
}
