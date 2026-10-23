<?php

namespace App\Modules\Identity\Http\Requests;

// Export and "sign out everywhere else": only the current password is needed.
class ConfirmPasswordRequest extends AccountRequest
{
    public function rules(): array
    {
        return ['current_password' => $this->currentPasswordRules()];
    }
}
