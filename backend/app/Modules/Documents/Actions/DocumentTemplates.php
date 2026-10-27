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
        $parts = [];
        foreach ($template['fields'] as $field) {
            $value = trim($fields[$field['key']] ?? '');
            if (! $blank && $value === '') {
                throw ValidationException::withMessages(['fields.'.$field['key'] => $field['label'].' alanını doldurun.']);
            }
            $parts[] = $field['label'].":\n".($blank ? str_repeat("................................................................................\n", $field['multiline'] ? 4 : 1) : $value);
        }

        $body = implode("\n\n", $parts);
        if (mb_strlen($body) > 16000) {
            throw ValidationException::withMessages(['fields' => 'Belge metni en çok 16.000 karakter olabilir. Açıklamaları biraz kısaltın.']);
        }

        return $body;
    }
}
