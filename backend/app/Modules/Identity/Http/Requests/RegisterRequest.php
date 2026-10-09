<?php

namespace App\Modules\Identity\Http\Requests;

use Illuminate\Validation\Rule;

class RegisterRequest extends IdentityRequest
{
    public function rules(): array
    {
        return array_merge($this->protectedFields(), [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:254', Rule::unique('users', 'email')],
            'password' => $this->newPasswordRules(),
        ]);
    }
}
