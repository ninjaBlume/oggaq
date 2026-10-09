<?php

use App\Models\User;
use App\Modules\Exams\Actions\StartExam;
use App\Modules\Identity\Notifications\ResetPasswordNotification;
use App\Modules\Identity\Notifications\VerifyEmailNotification;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\QuestionBank\Models\Topic;
use App\Modules\Tenancy\Actions\ProvisionMembership;
use App\Modules\Tenancy\Models\StudyContext;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

// Synthetic browser fixtures only. Never seed a development or production database.
require __DIR__.'/../backend/vendor/autoload.php';
$app = require __DIR__.'/../backend/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (config('database.default') !== 'pgsql' || config('database.connections.pgsql.database') !== 'oggaq_test'
    || ! in_array($app->environment(), ['local', 'testing'], true)) {
    throw new RuntimeException('Browser fixtures require the isolated oggaq_test PostgreSQL database.');
}
$operation = $argv[1] ?? '';
if (! in_array($operation, ['setup', 'setup-study', 'verification-link', 'reset-link', 'near-deadline', 'cleanup'], true)) {
    throw new InvalidArgumentException('Expected setup or cleanup.');
}
if (in_array($operation, ['verification-link', 'reset-link'], true)) {
    $email = $argv[2] ?? '';
    if (! str_ends_with($email, '@example.test')) {
        throw new RuntimeException('Link fixtures require synthetic accounts.');
    }
    $user = User::where('email', $email)->firstOrFail();
    if ($operation === 'verification-link') {
        $message = (new VerifyEmailNotification)->toMail($user);
    } else {
        $token = Password::broker()->createToken($user);
        $message = (new ResetPasswordNotification($token))->toMail($user);
    }
    echo $message->actionUrl;
    exit;
}
if ($operation === 'near-deadline') {
    $student = User::where('email', 'e2e-student@example.test')->firstOrFail();
    $context = $student->studyContexts()->whereNull('tenant_id')->firstOrFail();
    Carbon::setTestNow(now()->subSeconds(57));
    $exam = app(StartExam::class)->execute($student, $context->id, ['id' => (string) Str::uuid(), 'question_count' => 3, 'duration_seconds' => 60]);
    echo '/study/'.$context->id.'/exams/'.$exam->id;
    exit;
}
Artisan::call('migrate:fresh', ['--force' => true]);
if (in_array($operation, ['setup', 'setup-study'], true)) {
    foreach (['admin', 'student', 'unverified'] as $role) {
        $user = User::factory()->create([
            'name' => $role === 'student' ? 'E2E öğrencisi' : 'E2E yöneticisi',
            'email' => 'e2e-'.$role.'@example.test',
            'password' => 'Synthetic-Browser-42!',
            'platform_role' => $role === 'student' ? 'student' : 'platform_admin',
            'email_verified_at' => $role === 'unverified' ? null : now(),
        ]);
        StudyContext::create(['user_id' => $user->id]);
    }
}
if ($operation === 'setup-study') {
    $admin = User::where('email', 'e2e-admin@example.test')->firstOrFail();
    $student = User::where('email', 'e2e-student@example.test')->firstOrFail();
    $tenant = Tenant::create(['name' => 'Sentetik eğitim kurumu', 'slug' => 'synthetic-company']);
    app(ProvisionMembership::class)->execute($admin, $tenant, ['user_id' => $student->id, 'role' => 'student']);
    $subject = Subject::create(['name' => 'Sentetik çalışma dersi', 'code' => 'synthetic-study']);
    $topic = Topic::create(['subject_id' => $subject->id, 'name' => 'Sentetik konu', 'code' => 'synthetic-topic']);
    $source = QuestionSource::create(['title' => 'Sentetik test kaynağı — resmî değildir']);
    foreach (['Sentetik birinci soru', 'Sentetik ikinci soru', 'Sentetik üçüncü soru'] as $stem) {
        $question = app(SaveQuestion::class)->execute($admin, [
            'subject_id' => $subject->id, 'topic_id' => $topic->id, 'source_id' => $source->id,
            'stem' => $stem, 'options' => ['Sentetik A', 'Sentetik B'], 'correct_option_position' => 1,
            'explanation' => 'Sentetik açıklama — gerçek sınav içeriği değildir.',
        ]);
        app(PublishQuestion::class)->execute($admin, $question, $question->revision);
    }
}
echo "Isolated oggaq_test fixtures: {$operation} complete.\n";
