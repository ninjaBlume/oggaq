<?php

namespace App\Modules\Identity\Http\Requests;

class UpdateProfileRequest extends IdentityRequest
{
    public function rules(): array
    {
        return array_merge($this->protectedFields(), [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['prohibited'],
            'password' => ['prohibited'],
        ]);
    }
}
