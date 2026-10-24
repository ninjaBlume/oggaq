<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Identity\Notifications\AccountDeletedNotification;
use App\Modules\Identity\Notifications\ConfirmEmailChangeNotification;
use App\Modules\Identity\Notifications\EmailChangeNoticeNotification;
use App\Modules\Identity\Notifications\PasswordChangedNotification;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Tests\TestCase;

class AccountLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private const NEW_PASSWORD = 'Another-Password-77!';

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    private function pool(int $count = 3): array
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $subject = Subject::create(['name' => 'Sentetik hesap dersi', 'code' => Str::uuid()]);
        $source = QuestionSource::create(['title' => 'Sentetik test kaynağı']);
        $questions = [];
        for ($i = 0; $i < $count; $i++) {
            $question = app(SaveQuestion::class)->execute($admin, ['source_id' => $source->id, 'subject_id' => $subject->id, 'stem' => 'Sentetik hesap '.$i, 'options' => ['A', 'B'], 'correct_option_position' => 1]);
            $questions[] = app(PublishQuestion::class)->execute($admin, $question, $question->revision);
        }

        return $questions;
    }

    private function contextOf(User $user): string
    {
        return $user->studyContexts()->whereNull('tenant_id')->firstOrFail()->id;
    }

    // The signed-in user starts a three-question exam, answers the first question and (optionally) finishes it.
    private function exam(User $user, bool $finish = true, int $count = 3): array
    {
        $this->asToken($user);
        $context = $this->contextOf($user);
        $exam = $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', ['id' => (string) Str::uuid(), 'question_count' => $count, 'duration_seconds' => 300])->assertOk()->json('data');
        $row = $exam['questions'][0];
        $this->putJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$exam['id'].'/answers/'.$row['id'], ['base_version' => $exam['revision'], 'selected_option_id' => $row['question']['options'][0]['id']])->assertOk();
        if ($finish) {
            $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$exam['id'].'/finish', ['base_version' => $exam['revision'] + 1])->assertOk();
        }

        return $exam;
    }

    private function mobileToken(User $user, string $platform = 'ios'): string
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/v1/auth/mobile-tokens', ['email' => $user->email, 'password' => self::PASSWORD, 'device_id' => (string) Str::uuid(), 'device_platform' => $platform])->assertCreated()->json('data.token');
    }

    private function withTokenOf(string $token): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    public function test_every_account_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/v1/me/sessions')->assertUnauthorized();
        $this->deleteJson('/api/v1/me/sessions/mobile-1')->assertUnauthorized();
        $this->postJson('/api/v1/me/sessions/revoke-others', ['current_password' => self::PASSWORD])->assertUnauthorized();
        $this->postJson('/api/v1/me/password', [])->assertUnauthorized();
        $this->postJson('/api/v1/me/email', [])->assertUnauthorized();
        $this->postJson('/api/v1/me/export', ['current_password' => self::PASSWORD])->assertUnauthorized();
        $this->deleteJson('/api/v1/me', ['current_password' => self::PASSWORD, 'confirmation' => 'HESABIMI SİL'])->assertUnauthorized();
    }

    public function test_changes_need_the_current_password_and_change_nothing_without_it(): void
    {
        $user = $this->createUser();
        $this->asToken($user);
        $this->postJson('/api/v1/me/password', ['current_password' => 'wrong-Password-1!', 'password' => self::NEW_PASSWORD, 'password_confirmation' => self::NEW_PASSWORD])->assertUnprocessable()->assertJsonStructure(['errors' => ['current_password']]);
        $this->postJson('/api/v1/me/email', ['current_password' => 'wrong-Password-1!', 'email' => 'new@example.test'])->assertUnprocessable()->assertJsonStructure(['errors' => ['current_password']]);
        $this->postJson('/api/v1/me/export', ['current_password' => 'wrong-Password-1!'])->assertUnprocessable();
        $this->postJson('/api/v1/me/sessions/revoke-others', ['current_password' => 'wrong-Password-1!'])->assertUnprocessable();
        $this->deleteJson('/api/v1/me', ['current_password' => 'wrong-Password-1!', 'confirmation' => 'HESABIMI SİL'])->assertUnprocessable();
        $this->postJson('/api/v1/me/password', [])->assertUnprocessable()->assertJsonStructure(['errors' => ['current_password', 'password']]);
        $fresh = $user->fresh();
        $this->assertTrue(password_verify(self::PASSWORD, $fresh->password));
        $this->assertNull($fresh->pending_email);
        $this->assertNotNull(User::find($user->id));
        Notification::assertNothingSent();
    }

    public function test_password_guessing_through_account_endpoints_is_throttled(): void
    {
        $user = $this->createUser();
        $this->asToken($user);
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/v1/me/sessions/revoke-others', ['current_password' => 'guess-'.$i])->assertUnprocessable();
        }
        $this->postJson('/api/v1/me/sessions/revoke-others', ['current_password' => self::PASSWORD])->assertStatus(429)->assertHeader('Retry-After');
        $this->assertTrue(password_verify(self::PASSWORD, $user->fresh()->password));
    }

    public function test_password_change_signs_other_devices_out_but_not_this_one(): void
    {
        $user = $this->createUser();
        $other = $this->mobileToken($user, 'android');
        $current = $this->mobileToken($user, 'ios');
        $this->withTokenOf($current)->postJson('/api/v1/me/password', ['current_password' => self::PASSWORD, 'password' => self::NEW_PASSWORD, 'password_confirmation' => self::NEW_PASSWORD])
            ->assertOk();
        $this->assertTrue(password_verify(self::NEW_PASSWORD, $user->fresh()->password));
        $this->assertStringStartsWith('$argon2id$', $user->fresh()->password);
        Notification::assertSentTo($user, PasswordChangedNotification::class);
        $this->withTokenOf($other)->getJson('/api/v1/me')->assertUnauthorized();
        $this->withTokenOf($current)->getJson('/api/v1/me')->assertOk();
        $this->assertDatabaseHas('audit_events', ['actor_id' => $user->id, 'action' => 'account.password_changed']);
    }

    public function test_password_change_rejects_weak_unconfirmed_and_unchanged_passwords(): void
    {
        $this->asToken($this->createUser());
        $this->postJson('/api/v1/me/password', ['current_password' => self::PASSWORD, 'password' => 'short', 'password_confirmation' => 'short'])->assertUnprocessable()->assertJsonStructure(['errors' => ['password']]);
        $this->postJson('/api/v1/me/password', ['current_password' => self::PASSWORD, 'password' => self::NEW_PASSWORD, 'password_confirmation' => 'different'])->assertUnprocessable()->assertJsonStructure(['errors' => ['password']]);
        $this->postJson('/api/v1/me/password', ['current_password' => self::PASSWORD, 'password' => self::PASSWORD, 'password_confirmation' => self::PASSWORD])->assertUnprocessable()->assertJsonStructure(['errors' => ['password']]);
    }

    public function test_web_session_survives_its_own_password_change(): void
    {
        $user = $this->createUser();
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => self::PASSWORD])->assertOk();
        $this->withHeader('Origin', 'http://127.0.0.1:5173')->postJson('/api/v1/me/password', ['current_password' => self::PASSWORD, 'password' => self::NEW_PASSWORD, 'password_confirmation' => self::NEW_PASSWORD])->assertOk();
        $this->withHeader('Origin', 'http://127.0.0.1:5173')->getJson('/api/v1/me')->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_session_list_marks_the_current_device_and_revocation_kills_that_token(): void
    {
        $user = $this->createUser();
        $phone = $this->mobileToken($user, 'ios');
        $tablet = $this->mobileToken($user, 'android');
        $list = $this->withTokenOf($phone)->getJson('/api/v1/me/sessions')->assertOk();
        $list->assertJsonCount(2, 'data');
        $byLabel = collect($list->json('data'))->keyBy('label');
        $this->assertTrue($byLabel['iOS cihaz']['current']);
        $this->assertFalse($byLabel['Android cihaz']['current']);
        $this->assertSame('mobile', $byLabel['iOS cihaz']['kind']);
        $this->assertStringNotContainsString($phone, $list->getContent());
        $this->withTokenOf($phone)->deleteJson('/api/v1/me/sessions/'.$byLabel['Android cihaz']['id'])->assertOk();
        $this->withTokenOf($tablet)->getJson('/api/v1/me')->assertUnauthorized();
        $this->withTokenOf($phone)->getJson('/api/v1/me/sessions')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_sessions_of_other_users_cannot_be_listed_or_revoked(): void
    {
        $user = $this->createUser();
        $victim = $this->createUser();
        $victimToken = $this->mobileToken($victim);
        $victimId = 'mobile-'.$victim->tokens()->firstOrFail()->id;
        $this->withTokenOf($this->mobileToken($user))->deleteJson('/api/v1/me/sessions/'.$victimId)->assertNotFound()->assertJsonPath('code', 'session_not_found');
        $this->deleteJson('/api/v1/me/sessions/web-'.str_repeat('a', 32))->assertNotFound();
        $this->deleteJson('/api/v1/me/sessions/not-an-id')->assertNotFound();
        $this->withTokenOf($victimToken)->getJson('/api/v1/me')->assertOk();
    }

    public function test_revoke_others_closes_every_other_token_and_browser_session(): void
    {
        config(['session.driver' => 'database']);
        $user = $this->createUser();
        $victim = $this->createUser();
        $this->mobileToken($user, 'android');
        $current = $this->mobileToken($user, 'ios');
        $victimToken = $this->mobileToken($victim);
        foreach ([$user->id, $victim->id] as $id) {
            DB::table('sessions')->insert(['id' => Str::random(40), 'user_id' => $id, 'ip_address' => '127.0.0.1', 'user_agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36', 'payload' => 'x', 'last_activity' => now()->timestamp]);
        }
        $this->withTokenOf($current)->postJson('/api/v1/me/sessions/revoke-others', ['current_password' => self::PASSWORD])->assertOk()->assertJsonPath('data.revoked', 2);
        $this->assertSame(1, $user->tokens()->count());
        $this->assertSame(0, DB::table('sessions')->where('user_id', $user->id)->count());
        $this->assertSame(1, DB::table('sessions')->where('user_id', $victim->id)->count());
        $this->withTokenOf($victimToken)->getJson('/api/v1/me')->assertOk();
    }

    public function test_browser_sessions_are_listed_with_opaque_ids_and_can_be_revoked(): void
    {
        config(['session.driver' => 'database']);
        $user = $this->createUser();
        $victim = $this->createUser();
        DB::table('sessions')->insert(['id' => 'raw-session-id-of-the-user-0000000000000000', 'user_id' => $user->id, 'ip_address' => '127.0.0.1', 'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0', 'payload' => 'x', 'last_activity' => now()->timestamp]);
        DB::table('sessions')->insert(['id' => 'raw-session-id-of-the-victim-00000000000000', 'user_id' => $victim->id, 'ip_address' => '127.0.0.1', 'user_agent' => 'x', 'payload' => 'x', 'last_activity' => now()->timestamp]);
        DB::table('sessions')->insert(['id' => 'raw-session-id-expired-0000000000000000000', 'user_id' => $user->id, 'ip_address' => '127.0.0.1', 'user_agent' => 'x', 'payload' => 'x', 'last_activity' => now()->subDays(3)->timestamp]);
        // The token making this request is a device too; the expired browser session and the victim's are not listed.
        $list = $this->asToken($user)->getJson('/api/v1/me/sessions')->assertOk()->assertJsonCount(2, 'data');
        $session = collect($list->json('data'))->firstWhere('kind', 'web');
        $this->assertSame('web', $session['kind']);
        $this->assertSame('Firefox · Windows', $session['label']);
        $this->assertMatchesRegularExpression('~^web-[0-9a-f]{32}$~', $session['id']);
        $this->assertStringNotContainsString('raw-session-id', $list->getContent());
        $victimOpaque = 'web-'.substr(hash_hmac('sha256', 'raw-session-id-of-the-victim-00000000000000', (string) config('app.key')), 0, 32);
        $this->deleteJson('/api/v1/me/sessions/'.$victimOpaque)->assertNotFound();
        $this->assertSame(1, DB::table('sessions')->where('user_id', $victim->id)->count());
        $this->deleteJson('/api/v1/me/sessions/'.$session['id'])->assertOk();
        $this->assertSame(0, DB::table('sessions')->where('user_id', $user->id)->where('id', 'raw-session-id-of-the-user-0000000000000000')->count());
    }

    public function test_email_change_waits_for_the_new_address_and_keeps_tokens(): void
    {
        $user = $this->createUser(['email' => 'old@example.test']);
        $token = $this->mobileToken($user);
        $this->withTokenOf($token)->postJson('/api/v1/me/email', ['current_password' => self::PASSWORD, 'email' => ' NEW@Example.test '])->assertStatus(202);
        $fresh = $user->fresh();
        $this->assertSame('old@example.test', $fresh->email);
        $this->assertSame('new@example.test', $fresh->pending_email);
        Notification::assertSentOnDemand(ConfirmEmailChangeNotification::class, fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === 'new@example.test');
        Notification::assertSentTo($user, EmailChangeNoticeNotification::class);
        $this->withTokenOf($token)->getJson('/api/v1/me')->assertOk()->assertJsonPath('data.pending_email', 'new@example.test');
        $url = URL::temporarySignedRoute('email-change.confirm', now()->addHour(), ['id' => $user->id, 'hash' => sha1('new@example.test')]);
        $this->withTokenOf($token)->getJson($url)->assertOk()->assertJsonPath('data.email', 'new@example.test')->assertJsonPath('data.pending_email', null);
        $fresh = $user->fresh();
        $this->assertSame('new@example.test', $fresh->email);
        $this->assertNotNull($fresh->email_verified_at);
        $this->assertNull($fresh->pending_email);
        $this->withTokenOf($token)->getJson('/api/v1/me')->assertOk()->assertJsonPath('data.email', 'new@example.test');
        $this->withTokenOf($token)->getJson($url)->assertUnprocessable()->assertJsonPath('code', 'invalid_email_change');
    }

    public function test_email_change_to_a_taken_address_looks_the_same_and_does_nothing(): void
    {
        $user = $this->createUser();
        $this->createUser(['email' => 'taken@example.test']);
        $free = $this->asToken($user)->postJson('/api/v1/me/email', ['current_password' => self::PASSWORD, 'email' => 'free@example.test']);
        $taken = $this->postJson('/api/v1/me/email', ['current_password' => self::PASSWORD, 'email' => 'taken@example.test']);
        $this->assertSame($free->status(), $taken->status());
        $this->assertSame($free->json(), $taken->json());
        // The taken request stored nothing; the pending address is still the earlier free one.
        $this->assertSame('free@example.test', $user->fresh()->pending_email);
        Notification::assertSentOnDemandTimes(ConfirmEmailChangeNotification::class, 1);
    }

    public function test_email_change_rejects_the_current_address_and_works_for_unverified_accounts(): void
    {
        $user = $this->createUser(['email' => 'typo@example.test', 'email_verified_at' => null]);
        $this->asToken($user)->postJson('/api/v1/me/email', ['current_password' => self::PASSWORD, 'email' => 'typo@example.test'])->assertUnprocessable()->assertJsonStructure(['errors' => ['email']]);
        $this->postJson('/api/v1/me/email', ['current_password' => self::PASSWORD, 'email' => 'right@example.test'])->assertStatus(202);
        $url = URL::temporarySignedRoute('email-change.confirm', now()->addHour(), ['id' => $user->id, 'hash' => sha1('right@example.test')]);
        $this->getJson($url)->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_email_change_confirmation_rejects_forged_expired_foreign_and_taken_links(): void
    {
        $user = $this->createUser();
        $this->asToken($user)->postJson('/api/v1/me/email', ['current_password' => self::PASSWORD, 'email' => 'new@example.test'])->assertStatus(202);
        $url = URL::temporarySignedRoute('email-change.confirm', now()->addHour(), ['id' => $user->id, 'hash' => sha1('new@example.test')]);
        $this->getJson($url.'&tampered=1')->assertForbidden();
        $this->getJson(URL::temporarySignedRoute('email-change.confirm', now()->subMinute(), ['id' => $user->id, 'hash' => sha1('new@example.test')]))->assertForbidden();
        $this->asToken($this->createUser())->getJson($url)->assertForbidden();
        // A link for an address that is not the pending one (a newer request replaced it) is stale.
        $this->asToken($user)->getJson(URL::temporarySignedRoute('email-change.confirm', now()->addHour(), ['id' => $user->id, 'hash' => sha1('other@example.test')]))->assertUnprocessable();
        // Someone registered the address between request and confirmation.
        $this->createUser(['email' => 'new@example.test']);
        $this->getJson($url)->assertStatus(409)->assertJsonPath('code', 'email_taken');
        $this->assertNotSame('new@example.test', $user->fresh()->email);
    }

    public function test_export_contains_only_the_actors_own_data(): void
    {
        $this->pool();
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $user = $this->createUser(['name' => 'Dışa Aktaran']);
        $this->createMembership($user, $tenant);
        $other = $this->createUser(['name' => 'Başka Öğrenci', 'email' => 'someone-else@example.test']);
        $this->createMembership($other, $tenant);
        $mine = $this->exam($user);
        $running = $this->exam($user, finish: false);
        $theirs = $this->exam($other);
        $response = $this->asToken($user)->post('/api/v1/me/export', ['current_password' => self::PASSWORD], ['Accept' => 'application/json']);
        $response->assertOk()->assertHeader('Content-Disposition');
        $this->assertStringContainsString('attachment; filename=oggaq-verilerim-', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('application/json', $response->headers->get('Content-Type'));
        $raw = $response->streamedContent();
        $data = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame($user->id, $data['profile']['id']);
        $this->assertSame('Kurum A', $data['memberships'][0]['tenant']);
        $this->assertCount(2, $data['study_contexts']);
        $ids = array_column($data['exam_attempts'], 'context_id');
        $this->assertCount(2, $data['exam_attempts']);
        $this->assertSame(array_fill(0, 2, $this->contextOf($user)), $ids);
        foreach (['Başka Öğrenci', 'someone-else@example.test', $other->id, $theirs['id']] as $foreign) {
            $this->assertStringNotContainsString($foreign, $raw);
        }
        foreach (['password', 'remember_token', 'token'] as $secret) {
            $this->assertStringNotContainsString('"'.$secret.'"', $raw);
        }
        $finished = collect($data['exam_attempts'])->firstWhere('finished_at', '!=', null);
        $this->assertSame(3, $finished['question_count']);
        $this->assertCount(3, $finished['answers']);
        $this->assertContains('correct', array_column($finished['answers'], 'outcome'));
        $this->assertArrayHasKey('correct', $finished['answers'][0]['options'][0]);
        // A running attempt never carries the answer key.
        $open = collect($data['exam_attempts'])->firstWhere('finished_at', null);
        $this->assertSame(1, $open['resume_position']);
        $this->assertNull($open['answers'][0]['outcome']);
        foreach ($open['answers'] as $answer) {
            foreach ($answer['options'] as $option) {
                $this->assertArrayNotHasKey('correct', $option);
            }
        }
        $this->assertSame($mine['id'], $mine['id']);
        $this->assertNotSame($running['id'], $mine['id']);
    }

    public function test_export_streams_a_long_history_as_valid_json_and_has_a_daily_allowance(): void
    {
        $this->pool();
        $user = $this->createUser();
        for ($i = 0; $i < 60; $i++) {
            $this->exam($user, count: 2);
            if ($i % 20 === 19) {
                Cache::flush(); // each exam is three requests; keep clear of the per-minute API throttle
            }
        }
        $this->asToken($user);
        $raw = $this->post('/api/v1/me/export', ['current_password' => self::PASSWORD], ['Accept' => 'application/json'])->assertOk()->streamedContent();
        $data = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        $this->assertCount(60, $data['exam_attempts']);
        $this->assertSame(['exported_at', 'profile', 'memberships', 'study_contexts', 'exam_attempts', 'practice_attempts', 'favorites', 'question_reports', 'sessions'], array_keys($data));
        $this->post('/api/v1/me/export', ['current_password' => self::PASSWORD])->assertOk()->streamedContent();
        $this->post('/api/v1/me/export', ['current_password' => self::PASSWORD])->assertOk()->streamedContent();
        // Wrong passwords never spend the allowance; the fourth real export is refused.
        $this->postJson('/api/v1/me/export', ['current_password' => 'wrong'])->assertUnprocessable();
        $this->postJson('/api/v1/me/export', ['current_password' => self::PASSWORD])->assertStatus(429)->assertJsonPath('code', 'export_limit');
    }

    private function report(User $user, array $exam, string $note): void
    {
        $this->asToken($user)->postJson('/api/v1/contexts/'.$exam['context_id'].'/exam-attempts/'.$exam['id'].'/answers/'.$exam['questions'][0]['id'].'/report', ['reason' => 'typo', 'note' => $note])->assertSuccessful();
    }

    private function deleteAccount(User $user, array $overrides = [])
    {
        return $this->asToken($user)->deleteJson('/api/v1/me', array_merge(['current_password' => self::PASSWORD, 'confirmation' => 'HESABIMI SİL'], $overrides));
    }

    // Row counts of everything that belongs to one user's study contexts.
    private function footprint(User $user): array
    {
        $contexts = DB::table('study_contexts')->where('user_id', $user->id)->pluck('id');
        $attempts = DB::table('exam_attempts')->whereIn('study_context_id', $contexts)->pluck('id');

        return [
            'contexts' => $contexts->count(), 'memberships' => DB::table('memberships')->where('user_id', $user->id)->count(),
            'bookmarks' => DB::table('exam_bookmarks')->whereIn('exam_attempt_id', $attempts)->count(),
            'attempts' => $attempts->count(), 'answers' => DB::table('exam_answers')->whereIn('exam_attempt_id', $attempts)->count(),
            'practice' => DB::table('practice_attempts')->whereIn('study_context_id', $contexts)->count(),
            'favorites' => DB::table('favorite_questions')->whereIn('study_context_id', $contexts)->count(),
            'tokens' => DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->count(),
            'sessions' => DB::table('sessions')->where('user_id', $user->id)->count(),
        ];
    }

    public function test_deleting_an_account_erases_the_person_and_nothing_else(): void
    {
        [$first] = $this->pool();
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $user = $this->createUser(['email' => 'leaving@example.test']);
        $colleague = $this->createUser();
        $this->createMembership($user, $tenant);
        $this->createMembership($colleague, $tenant, 'company_admin');
        $other = $this->createUser();
        $this->createMembership($other, $tenant);
        $token = $this->mobileToken($user);
        $mine = $this->exam($user);
        $this->exam($user, finish: false);
        $theirs = $this->exam($other);
        $contextId = $this->contextOf($user);
        $this->report($user, $mine, 'Kişisel not metni');
        $this->report($other, $theirs, 'Başkasının notu');
        foreach ([$contextId, $this->contextOf($other)] as $context) {
            DB::table('favorite_questions')->insert(['study_context_id' => $context, 'question_id' => $first->id, 'created_at' => now()]);
            DB::table('sessions')->insert(['id' => Str::random(40), 'user_id' => $context === $contextId ? $user->id : $other->id, 'ip_address' => '127.0.0.1', 'user_agent' => 'x', 'payload' => 'x', 'last_activity' => now()->timestamp]);
        }
        DB::table('password_reset_tokens')->insert(['email' => 'leaving@example.test', 'token' => 'hash', 'created_at' => now()]);
        DB::table('audit_events')->insert(['id' => Str::uuid(), 'actor_id' => $user->id, 'tenant_id' => null, 'target_id' => $user->id, 'action' => 'test.event', 'created_at' => now()]);
        $before = $this->footprint($user);
        $this->assertGreaterThan(0, $before['answers']);
        $otherBefore = $this->footprint($other);
        $reportQuestion = DB::table('question_reports')->where('user_id', $user->id)->value('question_id');
        $reports = DB::table('question_reports')->count();

        $this->deleteAccount($user)->assertOk();

        $this->assertNull(User::find($user->id));
        $this->assertSame(array_fill_keys(array_keys($before), 0), $this->footprint($user));
        $this->assertSame($otherBefore, $this->footprint($other));
        $this->assertSame(0, DB::table('password_reset_tokens')->where('email', 'leaving@example.test')->count());
        $this->assertSame($reports, DB::table('question_reports')->count());
        $kept = DB::table('question_reports')->where('question_id', $reportQuestion)->whereNull('user_id')->first();
        $this->assertNotNull($kept);
        $this->assertNull($kept->note);
        $this->assertNull($kept->exam_attempt_id);
        $this->assertSame('typo', $kept->reason);
        $this->assertSame('Başkasının notu', DB::table('question_reports')->where('user_id', $other->id)->value('note'));
        $this->assertSame(0, DB::table('audit_events')->where('actor_id', $user->id)->count());
        $this->assertSame(0, DB::table('audit_events')->where('target_id', $user->id)->count());
        $this->assertSame(1, DB::table('audit_events')->where('action', 'test.event')->whereNull('actor_id')->count());
        $this->assertSame(1, DB::table('audit_events')->where('action', 'account.deleted')->whereNull('actor_id')->count());
        $this->assertNotNull(User::find($colleague->id));
        $this->assertNotNull(Tenant::find($tenant->id));
        Notification::assertSentOnDemand(AccountDeletedNotification::class, fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === 'leaving@example.test');
        $this->withTokenOf($token)->getJson('/api/v1/me')->assertUnauthorized();
        // The erasure switch never stays on after the action.
        $this->assertNotSame('on', DB::selectOne("select current_setting('oggaq.account_erasure', true) as value")->value);
    }

    public function test_deletion_needs_the_confirmation_phrase_and_the_password(): void
    {
        $user = $this->createUser();
        $this->deleteAccount($user, ['confirmation' => 'hesabımı sil'])->assertUnprocessable()->assertJsonStructure(['errors' => ['confirmation']]);
        $this->deleteAccount($user, ['confirmation' => ''])->assertUnprocessable();
        $this->deleteAccount($user, ['current_password' => 'wrong-Password-1!'])->assertUnprocessable()->assertJsonStructure(['errors' => ['current_password']]);
        $this->assertNotNull(User::find($user->id));
        Notification::assertNothingSent();
    }

    public function test_platform_admins_and_the_only_company_admin_cannot_delete_themselves(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $this->deleteAccount($admin)->assertStatus(409)->assertJsonPath('code', 'admin_account');
        $this->assertNotNull(User::find($admin->id));

        $tenant = Tenant::create(['name' => 'Kurum B', 'slug' => 'kurum-b']);
        $only = $this->createUser();
        $this->createMembership($only, $tenant, 'company_admin');
        $this->deleteAccount($only)->assertStatus(409)->assertJsonPath('code', 'last_company_admin');
        $this->assertNotNull(User::find($only->id));
        $this->assertSame(1, DB::table('memberships')->where('user_id', $only->id)->count());

        // With another active company admin the first may go; a revoked second admin does not count.
        $second = $this->createUser();
        $secondMembership = $this->createMembership($second, $tenant, 'company_admin');
        $secondMembership->update(['status' => 'revoked', 'revoked_at' => now()]);
        $this->deleteAccount($only)->assertStatus(409);
        $secondMembership->update(['status' => 'active', 'revoked_at' => null]);
        $this->deleteAccount($only)->assertOk();
        $this->assertNull(User::find($only->id));
        $this->assertNotNull(User::find($second->id));
    }

    public function test_results_stay_undeletable_outside_the_erasure_action(): void
    {
        $this->pool();
        $user = $this->createUser();
        $stayer = $this->createUser();
        $this->exam($stayer);
        $this->exam($user);
        $this->deleteAccount($user)->assertOk();
        // The same database session just ran an erasure: the guards must be closed again.
        $attempt = DB::table('exam_attempts')->whereNotNull('finished_at')->value('id');
        $this->assertNotNull($attempt);
        try {
            DB::transaction(fn () => DB::table('exam_answers')->where('exam_attempt_id', $attempt)->delete());
            $this->fail('A finished exam answer was deleted outside the erasure action.');
        } catch (QueryException $exception) {
            $this->assertStringContainsString('Completed exam answers are immutable', $exception->getMessage());
        }
        $this->assertSame(3, DB::table('exam_answers')->where('exam_attempt_id', $attempt)->count());
    }

    public function test_report_notes_stay_immutable_outside_the_erasure_action(): void
    {
        $this->pool();
        $user = $this->createUser();
        $exam = $this->exam($user);
        $this->report($user, $exam, 'Not');
        try {
            DB::transaction(fn () => DB::table('question_reports')->where('user_id', $user->id)->update(['note' => null]));
            $this->fail('A report note was cleared outside the erasure action.');
        } catch (QueryException $exception) {
            $this->assertStringContainsString('Question report content is immutable', $exception->getMessage());
        }
    }

    public function test_short_lived_personal_data_has_scheduled_retention(): void
    {
        $this->artisan('schedule:list')->expectsOutputToContain('auth:clear-resets')->expectsOutputToContain('queue:prune-failed')->expectsOutputToContain('sanctum:prune-expired')->assertSuccessful();
    }

    // New tables that point at a person must be handled by DeleteAccount (and exported if they hold the person's data):
    // this list is the checklist. A new foreign key to one of these tables fails the test until it is added here.
    public function test_every_reference_to_a_person_is_known_to_the_erasure_action(): void
    {
        $references = DB::select(<<<'SQL'
SELECT c.conrelid::regclass::text AS tbl, array_to_string(array_agg(a.attname ORDER BY k.ord), ',') AS cols, c.confrelid::regclass::text AS ref
FROM pg_constraint c
JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
WHERE c.contype = 'f' AND c.confrelid IN ('users'::regclass, 'study_contexts'::regclass, 'memberships'::regclass, 'exam_attempts'::regclass)
GROUP BY c.oid, c.conrelid, c.confrelid
SQL);
        $found = collect($references)->map(fn ($row) => "{$row->tbl}({$row->cols}) -> {$row->ref}")->sort()->values()->all();
        $handled = [
            // deleted with the person
            'memberships(user_id) -> users', 'study_contexts(user_id) -> users', 'sessions(user_id) -> users',
            'exam_attempts(study_context_id) -> study_contexts', 'practice_attempts(study_context_id) -> study_contexts', 'favorite_questions(study_context_id) -> study_contexts',
            'exam_answers(exam_attempt_id) -> exam_attempts', 'exam_bookmarks(exam_attempt_id) -> exam_attempts', 'study_contexts(membership_id,tenant_id,user_id) -> memberships',
            // link severed, row kept
            'audit_events(actor_id) -> users', 'question_reports(user_id) -> users', 'question_reports(exam_attempt_id) -> exam_attempts',
            // only platform admins author these, and platform admins cannot delete themselves
            'questions(created_by) -> users', 'official_exams(created_by) -> users', 'import_batches(created_by) -> users', 'import_batches(approved_by) -> users',
            'official_exam_question_changes(actor_id) -> users', 'question_reports(resolved_by) -> users',
        ];
        sort($handled);
        $this->assertSame($handled, $found, 'A table now references users, study contexts, memberships or exam attempts: handle it in DeleteAccount (and ExportAccountData), then list it here.');

        // Personal data held without a foreign key.
        $columns = collect(DB::select("SELECT table_name || '.' || column_name AS name FROM information_schema.columns WHERE table_schema = 'public' AND (column_name IN ('email', 'user_id', 'actor_id', 'ip_address', 'user_agent') OR column_name LIKE '%\\_by' ESCAPE '\\') ORDER BY 1"))->pluck('name')->all();
        $known = ['audit_events.actor_id', 'import_batches.approved_by', 'import_batches.created_by', 'memberships.user_id', 'official_exam_question_changes.actor_id', 'official_exams.created_by',
            'password_reset_tokens.email', 'question_reports.resolved_by', 'question_reports.user_id', 'questions.created_by', 'sessions.ip_address', 'sessions.user_agent', 'sessions.user_id',
            'study_contexts.user_id', 'users.email'];
        $this->assertSame($known, $columns, 'A column that can hold personal data is new: decide how deletion and export treat it, then list it here.');
    }
}
