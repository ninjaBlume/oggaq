<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Throwable;

// What a load balancer or uptime monitor may ask: is this instance able to serve? Only booleans leave this class:
// no versions, hosts, paths or error texts (the real reason goes to the log without request data).
class Readiness
{
    // The scheduler writes this every minute (routes/console.php); three missed minutes count as dead.
    public const HEARTBEAT_KEY = 'scheduler:heartbeat';

    public const HEARTBEAT_MAX_AGE_SECONDS = 180;

    /** @return array<string, bool> */
    public function checks(): array
    {
        return [
            'database' => $this->attempt(fn () => DB::select('select 1') !== []),
            'redis' => $this->attempt(fn () => (bool) Redis::connection()->ping()),
            'migrations' => $this->attempt(fn () => $this->pendingMigrations() === []),
            'queue' => $this->attempt(fn () => Queue::size() >= 0),
            'scheduler' => $this->attempt(fn () => ($beat = Cache::get(self::HEARTBEAT_KEY)) !== null && now()->timestamp - (int) $beat <= self::HEARTBEAT_MAX_AGE_SECONDS),
        ];
    }

    // 503 only when the instance cannot serve requests; a dead scheduler (exams are no longer closed on time) is
    // reported as "degraded" with 200 so that monitors can alert on it without taking the instance out of rotation.
    public function status(array $checks): string
    {
        $serving = array_diff_key($checks, ['scheduler' => true]);

        return in_array(false, $serving, true) ? 'unavailable' : (in_array(false, $checks, true) ? 'degraded' : 'ok');
    }

    /** @return list<string> */
    private function pendingMigrations(): array
    {
        $migrator = app('migrator');
        $files = array_keys($migrator->getMigrationFiles(array_merge([database_path('migrations')], $migrator->paths())));

        return array_values(array_diff($files, $migrator->getRepository()->getRan()));
    }

    private function attempt(callable $check): bool
    {
        try {
            return (bool) $check();
        } catch (Throwable $exception) {
            report($exception);

            return false;
        }
    }
}
