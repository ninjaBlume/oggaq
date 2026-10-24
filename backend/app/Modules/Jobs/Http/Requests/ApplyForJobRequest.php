<?php

namespace App\Modules\Jobs\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApplyForJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['contact_name' => ['required', 'string', 'min:2', 'max:100'], 'contact_email' => ['required', 'email', 'max:254'], 'phone' => ['required', 'string', 'min:7', 'max:30', 'regex:/^(?=(?:\D*\d){7,15}\D*$)[+0-9() .-]+$/'], 'cover_letter' => ['nullable', 'string', 'max:2000']] + array_fill_keys(['user_id', 'status', 'job_snapshot', 'revision', 'job_posting_id'], ['prohibited']);
    }
}
