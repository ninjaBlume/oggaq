<?php

namespace App\Modules\Identity\Http\Requests;

use App\Support\PrivacyNotice;
use Illuminate\Validation\Rule;

class RegisterRequest extends IdentityRequest
{
    public function rules(): array
    {
        return array_merge($this->protectedFields(), [
            'privacy_notice_version' => PrivacyNotice::rules(),
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:254', Rule::unique('users', 'email')],
            'password' => $this->newPasswordRules(),
        ]);
    }
}
