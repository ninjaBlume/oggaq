<?php

namespace App\Modules\Identity\Http\Requests;

class ChangePasswordRequest extends AccountRequest
{
    public function rules(): array
    {
        return [
            'current_password' => $this->currentPasswordRules(),
            'password' => array_merge($this->newPasswordRules(), ['different:current_password']),
        ];
    }

    public function messages(): array
    {
        return ['password.different' => 'Yeni parola mevcut paroladan farklı olmalıdır.'];
    }
}
