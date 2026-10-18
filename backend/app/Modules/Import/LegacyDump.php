<?php

namespace App\Modules\Import;

use RuntimeException;

// Text-only reader for a MySQL/MariaDB dump. It never executes SQL and only materialises the tables it is asked for;
// every other statement (including personal-data tables) is skipped without being parsed.
class LegacyDump
{
    private const SPECIAL = "'\"`;#-/";

    /** @return array<string, list<array<string, int|string|null>>> */
    public static function read(string $path, array $tables): array
    {
        $data = @file_get_contents($path);
        if ($data === false) {
            throw new RuntimeException('Kaynak dosya okunamadı.');
        }
        $rows = array_fill_keys($tables, []);
        $columns = [];
        $length = strlen($data);
        $start = 0;
        $i = 0;
        while ($i < $length) {
            $i += strcspn($data, self::SPECIAL, $i);
            if ($i >= $length) {
                break;
            }
            $char = $data[$i];
            if ($char === "'" || $char === '"') {
                $i = self::skipString($data, $i, $length);
            } elseif ($char === '`') {
                $end = strpos($data, '`', $i + 1);
                $i = $end === false ? $length : $end + 1;
            } elseif ($char === '#' || ($char === '-' && ($data[$i + 1] ?? '') === '-')) {
                $end = strpos($data, "\n", $i);
                $i = $end === false ? $length : $end + 1;
                if (self::blank($data, $start, $i)) {
                    $start = $i;
                }
            } elseif ($char === '/' && ($data[$i + 1] ?? '') === '*') {
                $end = strpos($data, '*/', $i + 2);
                $i = $end === false ? $length : $end + 2;
                if (self::blank($data, $start, $i)) {
                    $start = $i;
                }
            } elseif ($char === ';') {
                self::statement(substr($data, $start, $i - $start), $tables, $columns, $rows);
                $start = ++$i;
            } else {
                $i++;
            }
        }

        return $rows;
    }

    private static function blank(string $data, int $from, int $to): bool
    {
        return preg_match('/^\s*(--[^\n]*\n|#[^\n]*\n|\/\*.*?\*\/)*\s*$/s', substr($data, $from, $to - $from)) === 1;
    }

    private static function skipString(string $data, int $i, int $length): int
    {
        $quote = $data[$i];
        $j = $i + 1;
        while ($j < $length) {
            $j += strcspn($data, $quote.'\\', $j);
            if ($j >= $length) {
                break;
            }
            if ($data[$j] === '\\') {
                $j += 2;
            } elseif (($data[$j + 1] ?? '') === $quote) {
                $j += 2;
            } else {
                return $j + 1;
            }
        }

        return $length;
    }

    private static function statement(string $statement, array $tables, array &$columns, array &$rows): void
    {
        $statement = ltrim($statement);
        if (preg_match('/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`(\w+)`/i', $statement, $match) && in_array($match[1], $tables, true)) {
            preg_match_all('/^\s*`(\w+)`/m', substr($statement, (int) strpos($statement, '(') + 1), $names);
            $columns[$match[1]] = $names[1];

            return;
        }
        if (! preg_match('/^INSERT\s+(?:IGNORE\s+)?INTO\s+`(\w+)`\s*(\([^)]*\))?\s*VALUES\b/i', $statement, $match) || ! in_array($match[1], $tables, true)) {
            return;
        }
        $names = ($match[2] ?? '') !== '' ? array_map(fn ($name) => trim($name, " `\n"), explode(',', trim($match[2], '()'))) : ($columns[$match[1]] ?? throw new RuntimeException("{$match[1]} için kolon bilgisi yok."));
        $body = substr($statement, strlen($match[0]));
        $length = strlen($body);
        $i = 0;
        while ($i < $length) {
            $open = strpos($body, '(', $i);
            if ($open === false) {
                break;
            }
            [$values, $i] = self::tuple($body, $open + 1, $length);
            if (count($values) !== count($names)) {
                throw new RuntimeException("{$match[1]} satırında beklenmeyen kolon sayısı.");
            }
            $rows[$match[1]][] = array_combine($names, $values);
        }
    }

    /** @return array{0: list<int|string|null>, 1: int} */
    private static function tuple(string $body, int $i, int $length): array
    {
        $values = [];
        while ($i < $length) {
            $i += strspn($body, " \n\r\t", $i);
            $char = $body[$i];
            if ($char === "'") {
                $end = self::skipString($body, $i, $length);
                $values[] = self::unescape(substr($body, $i + 1, $end - $i - 2));
                $i = $end;
            } else {
                $end = $i + strcspn($body, ',)', $i);
                $token = trim(substr($body, $i, $end - $i));
                $values[] = strcasecmp($token, 'NULL') === 0 ? null : (preg_match('/^-?\d+$/', $token) === 1 ? (int) $token : $token);
                $i = $end;
            }
            $i += strspn($body, " \n\r\t", $i);
            if (($body[$i] ?? '') === ',') {
                $i++;
            } elseif (($body[$i] ?? '') === ')') {
                return [$values, $i + 1];
            }
        }
        throw new RuntimeException('Kapanmamış satır grubu.');
    }

    private static function unescape(string $text): string
    {
        if (! str_contains($text, '\\') && ! str_contains($text, "''")) {
            return $text;
        }
        $map = ['n' => "\n", 'r' => "\r", 't' => "\t", '0' => "\0", 'b' => "\x08", 'Z' => "\x1a"];

        return (string) preg_replace_callback('/\\\\(.)|\'\'/s', fn ($m) => $m[0] === "''" ? "'" : ($map[$m[1]] ?? $m[1]), $text);
    }
}
