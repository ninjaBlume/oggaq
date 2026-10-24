<?php

use App\Models\User;
use App\Modules\Exams\Actions\FinalizeExam;
use App\Modules\Exams\Actions\StartExam;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\Identity\Notifications\ConfirmEmailChangeNotification;
use App\Modules\Identity\Notifications\ResetPasswordNotification;
use App\Modules\Identity\Notifications\VerifyEmailNotification;
use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\QuestionBank\Models\Topic;
use App\Modules\Tenancy\Actions\ProvisionMembership;
use App\Modules\Tenancy\Models\StudyContext;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
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
if (! in_array($operation, ['setup', 'setup-study', 'verification-link', 'reset-link', 'near-deadline', 'disposable-user', 'user-exists', 'email-change-link', 'official-exam', 'subject-exam', 'more-subject-exams', 'favorite', 'jobs', 'long-result', 'paired-exam-draft', 'scoring', 'scored-exam-draft', 'cleanup'], true)) {
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
if (in_array($operation, ['disposable-user', 'user-exists', 'email-change-link'], true)) {
    // Throw-away accounts for destructive account flows (deletion, e-mail change); they always end in @example.test.
    $email = $argv[2] ?? '';
    if (! str_ends_with($email, '@example.test')) {
        throw new RuntimeException('Account fixtures require synthetic accounts.');
    }
    if ($operation === 'user-exists') {
        echo User::where('email', $email)->exists() ? '1' : '0';
        exit;
    }
    if ($operation === 'email-change-link') {
        $user = User::where('email', $email)->firstOrFail();
        echo (new ConfirmEmailChangeNotification($user->id, (string) $user->pending_email))->toMail($user)->actionUrl;
        exit;
    }
    // A verified student with one finished exam (first question answered), so deletion and export have something to act on.
    $user = User::factory()->create(['name' => 'E2E hesap kullanıcısı', 'email' => $email, 'password' => 'Synthetic-Browser-42!', 'platform_role' => 'student', 'email_verified_at' => now()]);
    $context = StudyContext::create(['user_id' => $user->id]);
    $exam = app(StartExam::class)->execute($user, $context->id, ['id' => (string) Str::uuid(), 'question_count' => 3, 'duration_seconds' => 300]);
    $answer = DB::table('exam_answers')->where('exam_attempt_id', $exam->id)->orderBy('position')->first();
    $option = DB::table('question_options')->where('question_version_id', $answer->question_version_id)->orderBy('position')->first();
    DB::table('exam_answers')->where('id', $answer->id)->update(['selected_option_id' => $option->id]);
    DB::transaction(fn () => app(FinalizeExam::class)->execute(ExamAttempt::whereKey($exam->id)->lockForUpdate()->firstOrFail()));
    echo $user->id;
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
if ($operation === 'scoring') { Artisan::call('scoring:install-verified'); echo 'scoring ready'; exit; }
if (in_array($operation, ['long-result', 'paired-exam-draft', 'scored-exam-draft'], true)) {
    $scored = $operation === 'scored-exam-draft';
    $paired = $operation !== 'long-result';
    $admin = User::where('email', 'e2e-admin@example.test')->firstOrFail();
    $versions = [];
    for ($position = 1; $position <= ($paired ? 125 : 200); $position++) {
        $question = app(SaveQuestion::class)->execute($admin, [
            'subject_id' => Subject::firstOrFail()->id, 'source_id' => QuestionSource::firstOrFail()->id,
            'stem' => 'Uzun sonuç sentetik soru '.$position, 'options' => ['Sentetik A '.$position, 'Sentetik B '.$position],
            'correct_option_position' => 1, 'explanation' => 'Sentetik açıklama '.$position.' — gerçek sınav içeriği değildir.',
        ]);
        $question = app(PublishQuestion::class)->execute($admin, $question, $question->revision);
        $versions[] = $question->published_version_id;
    }
    $official = app(SaveOfficialExam::class)->execute($admin, [
        'exam_type_id' => ExamType::where('code', 'synthetic-whole')->firstOrFail()->id, 'weapon_status' => 'armed',
        'title' => $paired ? 'Tek giriş sentetik sınav' : 'Uzun sentetik sınav', 'year' => $scored ? 2023 : 2024, 'exam_number' => $scored ? '104' : ($paired ? '125' : '200'), 'question_version_ids' => $versions, 'generate_unarmed' => $paired, 'scoring_period_id' => $scored ? \App\Modules\Scoring\Models\ScoringPeriod::where('education_type','basic')->where('weapon_status','armed')->where('number',104)->firstOrFail()->id : null,
    ]);
    if ($paired) { echo $official->id; exit; }
    app(PublishOfficialExam::class)->execute($admin, $official);
    $student = User::where('email', 'e2e-student@example.test')->firstOrFail();
    $context = $student->studyContexts()->whereNull('tenant_id')->firstOrFail();
    $exam = app(StartExam::class)->execute($student, $context->id, ['id' => (string) Str::uuid(), 'official_exam_id' => $official->id, 'duration_seconds' => 300]);
    foreach ([1 => 1, 2 => 2] as $position => $optionPosition) {
        $answer = DB::table('exam_answers')->where('exam_attempt_id', $exam->id)->where('position', $position)->first();
        $option = DB::table('question_options')->where('question_version_id', $answer->question_version_id)->where('position', $optionPosition)->first();
        DB::table('exam_answers')->where('id', $answer->id)->update(['selected_option_id' => $option->id]);
    }
    DB::transaction(fn () => app(FinalizeExam::class)->execute(ExamAttempt::whereKey($exam->id)->lockForUpdate()->firstOrFail()));
    echo '/study/'.$context->id.'/exams/'.$exam->id;
    exit;
}
if ($operation === 'official-exam') {
    // Published past exam over the setup-study questions, in reverse order, for client flows.
    $admin = User::where('email', 'e2e-admin@example.test')->firstOrFail();
    $versions = Question::orderBy('id')->pluck('published_version_id')->reverse()->values()->all();
    // One published question that belongs to no exam, to prove exam filters and exam labels.
    $outside = app(SaveQuestion::class)->execute($admin, [
        'subject_id' => Subject::firstOrFail()->id, 'source_id' => QuestionSource::firstOrFail()->id, 'stem' => 'Sınavda olmayan sentetik soru',
        'options' => ['Sentetik A', 'Sentetik B'], 'correct_option_position' => 1,
    ]);
    app(PublishQuestion::class)->execute($admin, $outside, $outside->revision);
    $exam = app(SaveOfficialExam::class)->execute($admin, [
        'exam_type_id' => ExamType::where('code', 'synthetic-whole')->firstOrFail()->id, 'weapon_status' => 'armed', 'title' => 'Sentetik çıkmış sınav', 'year' => 2023,
        'term' => '1. dönem', 'exam_number' => '1', 'question_version_ids' => $versions,
    ]);
    app(PublishOfficialExam::class)->execute($admin, $exam);
    echo $exam->id;
    exit;
}
if ($operation === 'subject-exam') {
    // Published Ders Sınavı (one subject's questions, natural order) over the setup-study questions.
    $admin = User::where('email', 'e2e-admin@example.test')->firstOrFail();
    $versions = Question::whereHas('latestVersion', fn ($version) => $version->where('stem', 'like', 'Sentetik % soru'))->orderBy('id')->pluck('published_version_id')->all();
    $exam = app(SaveOfficialExam::class)->execute($admin, [
        'exam_type_id' => ExamType::where('code', 'synthetic-subject')->firstOrFail()->id, 'subject_id' => Subject::firstOrFail()->id, 'title' => 'Sentetik ders sınavı', 'year' => 2023,
        'term' => '1. dönem', 'exam_number' => '1', 'question_version_ids' => $versions,
    ]);
    app(PublishOfficialExam::class)->execute($admin, $exam);
    echo $exam->id;
    exit;
}
if ($operation === 'more-subject-exams') {
    // Ten more subjects with long names (as in the real catalog), each with a published Ders Sınavı over the same questions.
    $admin = User::where('email', 'e2e-admin@example.test')->firstOrFail();
    $versions = Question::whereHas('latestVersion', fn ($version) => $version->where('stem', 'like', 'Sentetik % soru'))->orderBy('id')->pluck('published_version_id')->all();
    foreach (['Özel güvenlik hukuku ve kişi hakları', 'Güvenlik tedbirleri', 'Güvenlik sistem ve cihazları', 'Temel ilk yardım', 'Genel kollukla ilişkiler', 'Yangın güvenliği ve tabii felaketlerde müdahale tarzı', 'Etkili iletişim', 'Kalabalık yönetimi', 'Kişi koruma', 'Uyuşturucu madde bilgileri'] as $index => $name) {
        $subject = Subject::create(['name' => 'Sentetik '.$name, 'code' => 'synthetic-more-'.$index]);
        $exam = app(SaveOfficialExam::class)->execute($admin, [
            'exam_type_id' => ExamType::where('code', 'synthetic-subject')->firstOrFail()->id, 'subject_id' => $subject->id, 'title' => 'Sentetik ders sınavı '.$name, 'year' => 2023,
            'term' => '1. dönem', 'exam_number' => '1', 'question_version_ids' => $versions,
        ]);
        app(PublishOfficialExam::class)->execute($admin, $exam);
    }
    exit;
}
if ($operation === 'jobs') {
    $admin = User::where('email', 'e2e-admin@example.test')->firstOrFail();
    foreach (['published', 'draft', 'closed'] as $status) {
        app(\App\Modules\Jobs\Actions\SaveJobPosting::class)->execute($admin, ['title' => 'Sentetik ÖGG ilanı '.$status, 'company_name' => 'Sentetik güvenlik firması', 'city' => 'İstanbul', 'description' => 'Yalnız otomatik test için oluşturulmuş ilan. Gerçek iş ilanı değildir.', 'weapon_requirement' => 'any', 'status' => $status, 'expires_at' => null]);
    }
    exit;
}
if ($operation === 'favorite') {
    // The three setup-study questions as favorites of the student's personal context (the review list screens need them).
    $student = User::where('email', 'e2e-student@example.test')->firstOrFail();
    $context = $student->studyContexts()->whereNull('tenant_id')->firstOrFail();
    foreach (Question::whereHas('latestVersion', fn ($version) => $version->where('stem', 'like', 'Sentetik % soru'))->pluck('id') as $questionId) {
        DB::table('favorite_questions')->insert(['study_context_id' => $context->id, 'question_id' => $questionId, 'created_at' => now()]);
    }
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
    ExamType::create(['name' => 'Deneme Sınavı', 'code' => 'synthetic-whole']);
    ExamType::create(['name' => 'Ders Sınavı', 'code' => 'synthetic-subject']);
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
