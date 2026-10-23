<?php

use App\Support\Readiness;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('sanctum:prune-expired --hours=24')->daily();
// Retention of short-lived personal data (docs/PRIVACY.md): expired reset tokens and failed-job payloads do not pile up.
Schedule::command('auth:clear-resets')->daily();
Schedule::command('queue:prune-failed --hours=168')->daily();
Schedule::command('horizon:snapshot')->everyFiveMinutes();

// Proof that the scheduler runs: GET /api/v1/health/ready reports "degraded" when this stops (App\Support\Readiness).
Schedule::call(fn () => Cache::put(Readiness::HEARTBEAT_KEY, now()->timestamp, 600))->name('scheduler-heartbeat')->everyMinute();
Schedule::command('exams:expire')->everyMinute()->withoutOverlapping();
