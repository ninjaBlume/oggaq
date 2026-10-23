<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('sanctum:prune-expired --hours=24')->daily();
// Retention of short-lived personal data (docs/PRIVACY.md): expired reset tokens and failed-job payloads do not pile up.
Schedule::command('auth:clear-resets')->daily();
Schedule::command('queue:prune-failed --hours=168')->daily();
Schedule::command('horizon:snapshot')->everyFiveMinutes();

Schedule::command('exams:expire')->everyMinute()->withoutOverlapping();
