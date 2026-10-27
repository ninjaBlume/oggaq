<?php

namespace App\Modules\Documents\Actions;

use DateTimeImmutable;

class DocumentDates
{
    public static function normalize(string $value): ?string
    {
        if (! preg_match('/\A(?:[0-9]{2}\/[0-9]{2}\/[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})\z/', $value)) {
            return null;
        }
        // ISO is accepted only for compatibility with already distributed clients.
        foreach (['d/m/Y', 'Y-m-d'] as $format) {
            $date = DateTimeImmutable::createFromFormat('!'.$format, $value);
            if ($date && $date->format($format) === $value && $date->format('Y') !== '0000') {
                return $date->format('Y-m-d');
            }
        }

        return null;
    }

    public static function display(string $value): string
    {
        $normalized = self::normalize($value);

        return $normalized === null ? $value : DateTimeImmutable::createFromFormat('!Y-m-d', $normalized)->format('d/m/Y');
    }
}
