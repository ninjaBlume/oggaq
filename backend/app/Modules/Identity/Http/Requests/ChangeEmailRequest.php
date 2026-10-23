<?php

namespace App\Modules\Identity\Http\Requests;

use Closure;

class ChangeEmailRequest extends AccountRequest
{
    public function rules(): array
    {
        return [
            'current_password' => $this->currentPasswordRules(),
            // Whether another account uses the address is deliberately not validated here: the answer would reveal it.
            'email' => ['required', 'string', 'email:rfc', 'max:254', function (string $attribute, mixed $value, Closure $fail) {
                if ($value === $this->user()?->email) {
                    $fail('Bu zaten hesabının e-posta adresi.');
                }
            }],
        ];
    }
}
