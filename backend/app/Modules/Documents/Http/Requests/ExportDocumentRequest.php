<?php

namespace App\Modules\Documents\Http\Requests;

use App\Modules\Documents\Actions\DocumentDates;
use App\Modules\Documents\Actions\DocumentTemplates;
use App\Support\PrivacyNotice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExportDocumentRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $date = $this->input('document_date');
        if (is_string($date) && ($normalized = DocumentDates::normalize($date)) !== null) {
            $this->merge(['document_date' => $normalized]);
        }
    }

    public function messages(): array
    {
        return ['document_date.date_format' => 'Tarihi gg/aa/yyyy biçiminde, geçerli bir gün olarak girin.'];
    }

    public function rules(DocumentTemplates $templates): array
    {
        $templates->find(is_string($this->input('template_id')) ? $this->input('template_id') : '');
        $plain = 'not_regex:/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u';

        return [
            'privacy_notice_version' => PrivacyNotice::rules(),
            'template_id' => ['required', 'string', 'max:80'],
            'mode' => ['required', Rule::in(['blank', 'guided', 'free'])],
            'title' => ['required_unless:mode,blank', 'nullable', 'string', 'max:150', $plain],
            'recipient' => ['nullable', 'string', 'max:300', $plain],
            'document_date' => ['nullable', 'date_format:Y-m-d'],
            'body' => ['required_unless:mode,blank', 'nullable', 'string', 'max:16000', $plain],
            'address' => ['nullable', 'string', 'max:600', $plain],
            'contact' => ['nullable', 'string', 'max:200', $plain],
            'attachments' => ['nullable', 'string', 'max:1500', $plain],
            'signers' => ['required_unless:mode,blank', 'array', 'max:6', 'min:1'],
            'signers.*' => ['array:role,name'],
            'signers.*.role' => ['required', 'string', 'max:80', $plain],
            'signers.*.name' => ['nullable', 'string', 'max:150', $plain],
        ];
    }
}
