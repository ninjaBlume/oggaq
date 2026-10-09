<?php

namespace App\Modules\Identity\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

abstract class IdentityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => mb_strtolower(trim($this->input('email')))]);
        }
    }

    protected function protectedFields(): array
    {
        return array_fill_keys(['id', 'user_id', 'tenant_id', 'role', 'platform_role', 'status', 'email_verified_at'], ['prohibited']);
    }

    protected function newPasswordRules(): array
    {
        return ['required', 'string', 'max:128', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()];
    }
}
