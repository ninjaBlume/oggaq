<?php

namespace App\Modules\Identity\Http\Requests;

class MobileTokenRequest extends LoginRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'device_id' => ['required', 'uuid'],
        ]);
    }
}
