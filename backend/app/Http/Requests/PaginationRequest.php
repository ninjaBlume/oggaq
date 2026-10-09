<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PaginationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['per_page' => ['sometimes', 'integer', 'min:1', 'max:100'], 'cursor' => ['sometimes', 'string', 'max:2048']];
    }
}
