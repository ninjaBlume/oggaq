<?php

namespace App\Modules\Documents\Actions;

use Illuminate\Validation\ValidationException;

class DocumentTemplates
{
    public function all(): array
    {
        return json_decode(file_get_contents(resource_path('document-templates.json')), true, flags: JSON_THROW_ON_ERROR);
    }

    public function find(string $id): array
    {
        return collect($this->all())->firstWhere('id', $id)
            ?? throw ValidationException::withMessages(['template_id' => 'Bir belge örneği seçin.']);
    }

    public function draft(array $template, array $fields, bool $blank = false): string
    {
        $replacements = [];
        foreach ($template['fields'] as $field) {
            $value = trim($fields[$field['key']] ?? '');
            if (! $blank && $value === '' && ! ($field['optional'] ?? false)) {
                throw ValidationException::withMessages(['fields.'.$field['key'] => $field['label'].' alanını doldurun.']);
            }
            $format = $field['format'] ?? 'text';
            $placeholder = match ($format) {
                'date' => '../../....',
                'time' => '..:..',
                default => $field['multiline'] ? "............................................................\n............................................................" : '................................................',
            };
            $replacements['{'.$field['key'].'}'] = $blank || $value === '' ? $placeholder : ($format === 'date' ? DocumentDates::display($value) : $value);
        }

        $body = strtr($template['body'], $replacements);
        if (mb_strlen($body) > 16000) {
            throw ValidationException::withMessages(['fields' => 'Belge metni en çok 16.000 karakter olabilir. Açıklamaları biraz kısaltın.']);
        }

        return $body;
    }
}
