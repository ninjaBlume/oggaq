<?php

namespace App\Modules\Identity\Http\Requests;

class DeleteAccountRequest extends AccountRequest
{
    public const CONFIRMATION = 'HESABIMI SİL';

    public function rules(): array
    {
        return [
            'current_password' => $this->currentPasswordRules(),
            'confirmation' => ['required', 'string', 'in:'.self::CONFIRMATION],
        ];
    }

    public function messages(): array
    {
        return ['confirmation.in' => 'Onay için “'.self::CONFIRMATION.'” yazmalısın.'];
    }
}
