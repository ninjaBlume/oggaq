<?php

namespace App\Modules\Tenancy\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CreateMembershipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('provision', $this->route('tenant'));
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'uuid', Rule::exists('users', 'id')->where('status', 'active')],
            'role' => ['required', Rule::in(['student', 'company_admin'])],
            'tenant_id' => ['prohibited'], 'status' => ['prohibited'], 'id' => ['prohibited'],
        ];
    }
}
