<?php

namespace App\Modules\Identity\Http\Requests;

class MobileTokenRequest extends LoginRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'device_id' => ['required', 'uuid'],
            // What kind of device this is; only shown in the user's own device list.
            'device_platform' => ['sometimes', 'in:ios,android,web'],
        ]);
    }
}
