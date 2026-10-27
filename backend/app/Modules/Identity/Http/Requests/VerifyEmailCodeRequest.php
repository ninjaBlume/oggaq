<?php

namespace App\Modules\Identity\Http\Requests;

class VerifyEmailCodeRequest extends IdentityRequest
{
    public function rules(): array
    {
        return array_merge($this->protectedFields(), ['code' => ['required', 'string', 'regex:/\A[0-9]{6}\z/']]);
    }
}
