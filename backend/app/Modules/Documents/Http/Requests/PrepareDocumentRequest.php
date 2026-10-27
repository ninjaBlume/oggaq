<?php

namespace App\Modules\Documents\Http\Requests;

use App\Modules\Documents\Actions\DocumentDates;
use App\Modules\Documents\Actions\DocumentTemplates;
use Illuminate\Foundation\Http\FormRequest;

class PrepareDocumentRequest extends FormRequest
{
    public function rules(DocumentTemplates $templates): array
    {
        $template = $templates->find(is_string($this->input('template_id')) ? $this->input('template_id') : '');

        $rules = [
            'template_id' => ['required', 'string', 'max:80'],
            'fields' => ['required', 'array:'.implode(',', array_column($template['fields'], 'key'))],
        ];
        foreach ($template['fields'] as $field) {
            $rules['fields.'.$field['key']] = [($field['optional'] ?? false) ? 'nullable' : 'required', 'string', 'max:6000', 'not_regex:/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u'];
            if (($field['format'] ?? '') === 'date') {
                $rules['fields.'.$field['key']][] = function ($attribute, $value, $fail): void {
                    if (! is_string($value) || DocumentDates::normalize($value) === null) {
                        $fail('Tarihi gg/aa/yyyy biçiminde, geçerli bir gün olarak girin.');
                    }
                };
            } elseif (($field['format'] ?? '') === 'time') {
                $rules['fields.'.$field['key']][] = 'regex:/\A(?:[01][0-9]|2[0-3]):[0-5][0-9]\z/';
            }
        }
        if ($template['id'] === 'petition-leave') {
            $rules['fields.end_date'][] = function ($attribute, $value, $fail): void {
                $start = $this->input('fields.start_date');
                $start = is_string($start) ? DocumentDates::normalize($start) : null;
                $end = is_string($value) ? DocumentDates::normalize($value) : null;
                if ($start && $end && $end < $start) {
                    $fail('İzin bitiş tarihi başlangıç tarihinden önce olamaz.');
                }
            };
        }

        return $rules;
    }
}
