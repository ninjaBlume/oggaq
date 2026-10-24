<?php

namespace App\Modules\Jobs\Http\Requests;

use App\Modules\Jobs\Models\JobPosting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SaveJobPostingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage', JobPosting::class);
    }

    public function rules(): array
    {
        return ['title' => ['required', 'string', 'max:240'], 'company_name' => ['required', 'string', 'max:200'], 'city' => ['required', 'string', 'max:100'], 'description' => ['required', 'string', 'max:10000'], 'weapon_requirement' => ['required', Rule::in(['any', 'armed', 'unarmed'])], 'status' => ['required', Rule::in(['draft', 'published', 'closed'])], 'expires_at' => ['nullable', 'date'], 'base_version' => [$this->isMethod('PATCH') ? 'required' : 'prohibited', 'integer', 'min:1']] + array_fill_keys(['id', 'created_by', 'revision', 'user_id'], ['prohibited']);
    }
}
