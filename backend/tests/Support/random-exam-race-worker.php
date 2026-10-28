<?php

use App\Models\User;
use App\Modules\Exams\Actions\StartRandomExam;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || config('database.connections.pgsql.database') !== 'oggaq_test') {
    throw new RuntimeException('Random race worker requires isolated test PostgreSQL.');
}
$user = User::where('email', 'random-race@example.test')->findOrFail($argv[1]);
fgets(STDIN);
$exam = app(StartRandomExam::class)->execute($user, $argv[2], ['id' => $argv[3], 'education_type' => 'basic', 'weapon_status' => $argv[4], 'duration_seconds' => 9000]);
echo json_encode(['id' => $exam->id, 'count' => $exam->question_count], JSON_THROW_ON_ERROR);
