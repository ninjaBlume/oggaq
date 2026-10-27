<?php

namespace App\Modules\Documents\Http\Requests;

use App\Modules\Documents\Actions\DocumentTemplates;
use Illuminate\Foundation\Http\FormRequest;

class PrepareDocumentRequest extends FormRequest
{
    public function rules(DocumentTemplates $templates): array
    {
        $template = $templates->find(is_string($this->input('template_id')) ? $this->input('template_id') : '');

        return [
            'template_id' => ['required', 'string', 'max:80'],
            'fields' => ['required', 'array:'.implode(',', array_column($template['fields'], 'key'))],
            'fields.*' => ['required', 'string', 'max:6000', 'not_regex:/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u'],
        ];
    }
}
