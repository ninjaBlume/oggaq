<?php

use App\Models\User;
use App\Modules\Exams\Actions\AccessExam;
use Illuminate\Contracts\Console\Kernel;

// Independent PostgreSQL connections, exclusively for the concurrency test.
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || config('database.connections.pgsql.database') !== 'oggaq_test') {
    throw new RuntimeException('Race worker requires isolated test PostgreSQL.');
}
$user = User::findOrFail($argv[1]);
if ($user->email !== 'exam-race@example.test') {
    throw new RuntimeException('Race worker requires its synthetic account.');
}
// Both processes wait for the same parent signal before they acquire row locks.
fgets(STDIN);
$result = app(AccessExam::class)->execute($user, $argv[2], $argv[3], finishRevision: 1);
echo json_encode(['revision' => $result->revision, 'blank' => $result->blank_count, 'finished_at' => $result->finished_at->toISOString()], JSON_THROW_ON_ERROR);
