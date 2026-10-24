<?php

namespace App\Modules\Jobs\Http\Requests;

use App\Modules\Jobs\Models\JobPosting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ReviewJobApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage', JobPosting::class);
    }

    public function rules(): array
    {
        return ['status' => ['required', Rule::in(['submitted', 'reviewing', 'accepted', 'rejected'])], 'base_version' => ['required', 'integer', 'min:1']];
    }
}
