<?php

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;

// Synthetic browser fixtures only. Never seed a development or production database.
require __DIR__.'/../backend/vendor/autoload.php';
$app = require __DIR__.'/../backend/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (config('database.default') !== 'pgsql' || config('database.connections.pgsql.database') !== 'oggaq_test'
    || ! in_array($app->environment(), ['local', 'testing'], true)) {
    throw new RuntimeException('Browser fixtures require the isolated oggaq_test PostgreSQL database.');
}
$operation = $argv[1] ?? '';
if (! in_array($operation, ['setup', 'cleanup'], true)) {
    throw new InvalidArgumentException('Expected setup or cleanup.');
}
Artisan::call('migrate:fresh', ['--force' => true]);
if ($operation === 'setup') {
    foreach (['admin', 'student', 'unverified'] as $role) {
        User::factory()->create([
            'name' => $role === 'student' ? 'E2E öğrencisi' : 'E2E yöneticisi',
            'email' => 'e2e-'.$role.'@example.test',
            'password' => 'Synthetic-Browser-42!',
            'platform_role' => $role === 'student' ? 'student' : 'platform_admin',
            'email_verified_at' => $role === 'unverified' ? null : now(),
        ]);
    }
}
echo "Isolated oggaq_test fixtures: {$operation} complete.\n";
