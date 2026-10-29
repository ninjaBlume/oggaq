<?php

namespace App\Support;

use App\Modules\Identity\AccountErasureLedger;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class PrivacyErasureLedger
{
    public static function applicationHash(string $id): string
    {
        // Domain separation prevents correlating account and application hashes.
        return AccountErasureLedger::hash('job-application|'.$id);
    }

    public static function recordApplication(string $id): void
    {
        DB::table('application_erasures')->insertOrIgnore(['id' => (string) Str::uuid(),
            'application_hash' => self::applicationHash($id), 'erased_at' => now()]);
    }

    /** @return list<array{scope:string, hash:string, erased_at:string}> */
    public static function entries(): array
    {
        $entries = [];
        foreach (['account' => ['account_erasures', 'user_hash'], 'job_application' => ['application_erasures', 'application_hash']] as $scope => [$table, $column]) {
            foreach (DB::table($table)->orderBy($column)->cursor() as $row) {
                $entries[] = ['scope' => $scope, 'hash' => $row->{$column}, 'erased_at' => Carbon::parse($row->erased_at)->utc()->toIso8601String()];
            }
        }

        return $entries;
    }

    public static function read(string $file): array
    {
        if (! is_file($file) || ! is_readable($file)) {
            throw new RuntimeException('Silme listesi okunamadı.');
        }
        $entries = [];
        foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $row = json_decode($line, true);
            // Accept historical account-only exports, never silently skip an unknown category.
            if (is_array($row) && isset($row['user_hash']) && ! isset($row['scope'])) {
                $row = ['scope' => 'account', 'hash' => $row['user_hash'], 'erased_at' => $row['erased_at'] ?? null];
            }
            if (! is_array($row) || ! in_array($row['scope'] ?? null, ['account', 'job_application'], true)
                || ! is_string($row['hash'] ?? null) || ! preg_match('/\A[a-f0-9]{64}\z/', $row['hash'])
                || ! is_string($row['erased_at'] ?? null) || ! preg_match('/\A\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)\z/', $row['erased_at'])) {
                throw new RuntimeException('Silme listesi geçersiz; hiçbir kayıt uygulanmadı.');
            }
            try {
                $date = Carbon::parse($row['erased_at']);
            } catch (\Exception) {
                throw new RuntimeException('Silme listesi tarihi geçersiz.');
            }
            if ($date->format('Y-m-d') !== substr($row['erased_at'], 0, 10)) {
                throw new RuntimeException('Silme listesi takvim tarihi geçersiz.');
            }
            if ($date->isFuture()) {
                throw new RuntimeException('Silme listesi gelecekteki bir işlemi içeriyor.');
            }
            $entries[] = ['scope' => $row['scope'], 'hash' => $row['hash'], 'erased_at' => $date->utc()->toIso8601String()];
        }

        return $entries;
    }

    public static function merge(array $entries): void
    {
        foreach ($entries as $row) {
            [$table, $column] = $row['scope'] === 'account' ? ['account_erasures', 'user_hash'] : ['application_erasures', 'application_hash'];
            DB::table($table)->insertOrIgnore(['id' => (string) Str::uuid(), $column => $row['hash'], 'erased_at' => $row['erased_at']]);
        }
    }

    public static function proof(int $applications): void
    {
        if ($applications > 0) {
            DB::table('privacy_erasure_runs')->insert(['id' => (string) Str::uuid(), 'policy_version' => config('privacy.policy_version'),
                'job_applications' => $applications, 'audit_events' => 0, 'account_erasures' => 0, 'executed_at' => now()]);
        }
    }
}
