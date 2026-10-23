<?php

namespace App\Modules\Identity;

use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

// The list of erased accounts that survives a restore (docs/PRIVACY.md). Only an irreversible keyed hash of the user
// id is stored: a restored user row can be recognised by it, nothing about the person can be read back.
class AccountErasureLedger
{
    public static function hash(string $userId): string
    {
        return hash_hmac('sha256', strtolower($userId), self::key());
    }

    public static function record(string $userId, CarbonInterface $at): void
    {
        DB::table('account_erasures')->insertOrIgnore(['id' => (string) Str::uuid(), 'user_hash' => self::hash($userId), 'erased_at' => $at]);
    }

    // Checks the entries of an export (a ledger kept apart from the backup) and returns their hashes.
    /** @return list<string> */
    public static function parse(iterable $entries): array
    {
        $hashes = [];
        foreach ($entries as $entry) {
            if (! is_array($entry) || ! isset($entry['user_hash'], $entry['erased_at']) || ! preg_match('/^[0-9a-f]{64}$/', (string) $entry['user_hash']) || strtotime((string) $entry['erased_at']) === false) {
                throw new RuntimeException('Erasure ledger export has an invalid entry.');
            }
            $hashes[(string) $entry['user_hash']] = (string) $entry['erased_at'];
        }

        return $hashes;
    }

    // Adds parsed entries; those already in the ledger are left alone. Returns how many were new.
    public static function merge(array $entries): int
    {
        $added = 0;
        foreach ($entries as $hash => $erasedAt) {
            $added += DB::table('account_erasures')->insertOrIgnore(['id' => (string) Str::uuid(), 'user_hash' => $hash, 'erased_at' => $erasedAt]);
        }

        return $added;
    }

    private static function key(): string
    {
        $key = (string) config('security.erasure_key');
        if ($key !== '') {
            return $key;
        }
        if (app()->environment('production')) {
            throw new RuntimeException('ERASURE_LEDGER_KEY is not set.');
        }

        return hash('sha256', 'oggaq-erasure-ledger|'.config('app.key'));
    }
}
