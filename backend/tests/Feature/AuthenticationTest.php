<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Identity\Actions\AuthenticateUser;
use App\Modules\Identity\Notifications\ResetPasswordNotification;
use App\Modules\Identity\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    private function registration(array $overrides = []): array
    {
        return array_merge(['name' => 'Test Öğrencisi', 'email' => 'student@example.test',
            'password' => self::PASSWORD, 'password_confirmation' => self::PASSWORD], $overrides);
    }

    public function test_registration_normalizes_email_hashes_password_and_creates_personal_context(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->registration(['email' => ' STUDENT@EXAMPLE.TEST ']));
        $response->assertCreated()->assertJsonPath('data.email', 'student@example.test')
            ->assertJsonPath('data.platform_role', 'student')->assertJsonMissingPath('data.password');
        $user = User::findOrFail($response->json('data.id'));
        $this->assertTrue(Str::isUuid($user->id));
        $this->assertTrue(Hash::check(self::PASSWORD, $user->password));
        $this->assertStringStartsWith('$argon2id$', $user->password);
        $this->assertNull($user->email_verified_at);
        $this->assertDatabaseHas('study_contexts', ['user_id' => $user->id, 'tenant_id' => null, 'membership_id' => null]);
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_registration_rejects_role_and_tenant_injection(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registration([
            'platform_role' => 'platform_admin', 'tenant_id' => Str::uuid(), 'email_verified_at' => now()->toISOString(),
        ]))->assertUnprocessable()->assertJsonPath('code', 'validation_failed');
        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_rejects_weak_password_and_case_insensitive_duplicate(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registration(['password' => 'short', 'password_confirmation' => 'short']))
            ->assertUnprocessable()->assertJsonStructure(['errors' => ['password']]);
        $this->createUser(['email' => 'student@example.test']);
        $this->postJson('/api/v1/auth/register', $this->registration(['email' => 'STUDENT@EXAMPLE.TEST']))
            ->assertUnprocessable()->assertJsonStructure(['errors' => ['email']]);
    }

    public function test_mobile_login_issues_expiring_hashed_token(): void
    {
        $user = $this->createUser();
        $response = $this->postJson('/api/v1/auth/mobile-tokens', [
            'email' => strtoupper($user->email), 'password' => self::PASSWORD, 'device_id' => Str::uuid(),
        ])->assertCreated()->assertJsonPath('data.token_type', 'Bearer');
        $token = $response->json('data.token');
        $record = $user->tokens()->firstOrFail();
        $this->assertNotEquals($token, $record->token);
        $this->assertEqualsWithDelta(now()->addDays(7)->timestamp, $record->expires_at->timestamp, 3);
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/me')->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_mobile_login_rotates_only_the_same_device_token(): void
    {
        $user = $this->createUser();
        $otherDevice = $user->createToken('device:'.Str::uuid(), ['api:access'], now()->addDay());
        $device = (string) Str::uuid();
        $payload = ['email' => $user->email, 'password' => self::PASSWORD, 'device_id' => $device];
        $first = $this->postJson('/api/v1/auth/mobile-tokens', $payload)->assertCreated()->json('data.token');
        $second = $this->postJson('/api/v1/auth/mobile-tokens', $payload)->assertCreated()->json('data.token');
        $this->assertNotEquals($first, $second);
        $this->assertEquals(2, $user->tokens()->count());
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $otherDevice->accessToken->id]);
        $this->app['auth']->forgetGuards();
        $this->withToken($first)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_invalid_unknown_and_suspended_credentials_have_same_response(): void
    {
        $user = $this->createUser(['status' => 'suspended']);
        $payload = ['email' => $user->email, 'password' => self::PASSWORD, 'device_id' => Str::uuid()];
        $first = $this->postJson('/api/v1/auth/mobile-tokens', $payload)->assertUnauthorized();
        $second = $this->postJson('/api/v1/auth/mobile-tokens', array_merge($payload, ['email' => 'missing@example.test']))->assertUnauthorized();
        $this->assertEquals($first->json('code'), $second->json('code'));
        $this->assertEquals($first->json('detail'), $second->json('detail'));
    }

    public function test_login_is_rate_limited(): void
    {
        $payload = ['email' => 'missing@example.test', 'password' => self::PASSWORD, 'device_id' => Str::uuid()];
        for ($index = 0; $index < 5; $index++) {
            $this->postJson('/api/v1/auth/mobile-tokens', $payload)->assertUnauthorized();
        }
        $this->postJson('/api/v1/auth/mobile-tokens', $payload)->assertStatus(429)
            ->assertJsonPath('code', 'rate_limited')->assertHeader('Retry-After');
    }

    public function test_expired_token_and_suspended_account_cannot_access_api(): void
    {
        $user = $this->createUser();
        $token = $user->createToken('expired', ['api:access'], now()->subMinute())->plainTextToken;
        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
        $user->forceFill(['status' => 'suspended'])->save();
        $this->asToken($user)->getJson('/api/v1/me')->assertForbidden()->assertJsonPath('code', 'account_inactive');
    }

    public function test_mobile_logout_revokes_only_current_token(): void
    {
        $user = $this->createUser();
        $token = $user->createToken('current', ['api:access'], now()->addHour())->plainTextToken;
        $other = $user->createToken('other', ['api:access'], now()->addHour());
        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $other->accessToken->id]);
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_web_login_and_logout_use_session(): void
    {
        $user = $this->createUser();
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => self::PASSWORD])
            ->assertOk()->assertJsonMissingPath('data.token');
        $this->assertAuthenticatedAs($user, 'web');
        $this->withHeader('Origin', 'http://127.0.0.1:5173')->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertGuest('web');
    }

    public function test_web_login_requires_csrf_outside_test_bypass(): void
    {
        $this->app['env'] = 'local';
        $this->postJson('/api/v1/auth/login', ['email' => 'student@example.test', 'password' => self::PASSWORD])
            ->assertForbidden()->assertJsonPath('code', 'csrf_failed');
    }

    public function test_email_verification_requires_valid_signature_and_correct_user(): void
    {
        $user = $this->createUser(['email_verified_at' => null]);
        $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $user->id, 'hash' => sha1($user->email)]);
        $this->asToken($user)->getJson($url.'&tampered=1')->assertForbidden();
        $this->asToken($user)->getJson($url)->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
        $other = $this->createUser();
        $this->asToken($other)->getJson($url)->assertForbidden();
    }

    public function test_expired_verification_link_is_rejected(): void
    {
        $user = $this->createUser(['email_verified_at' => null]);
        $url = URL::temporarySignedRoute('verification.verify', now()->subMinute(), ['id' => $user->id, 'hash' => sha1($user->email)]);
        $this->asToken($user)->getJson($url)->assertForbidden();
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_unverified_user_can_resend_but_cannot_use_tenant_contexts(): void
    {
        $user = $this->createUser(['email_verified_at' => null]);
        $this->asToken($user)->postJson('/api/v1/auth/email-verification-notification')->assertOk();
        Notification::assertSentTo($user, VerifyEmailNotification::class);
        $this->getJson('/api/v1/me/contexts')->assertForbidden()->assertJsonPath('code', 'email_unverified');
    }

    public function test_password_reset_has_generic_response_for_missing_account(): void
    {
        $user = $this->createUser();
        $first = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();
        $second = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'missing@example.test'])->assertOk();
        $this->assertEquals($first->json('data'), $second->json('data'));
        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_password_reset_revokes_tokens_and_sessions_and_cannot_be_replayed(): void
    {
        $user = $this->createUser();
        $user->createToken('old', ['api:access'], now()->addHour());
        DB::table('sessions')->insert(['id' => 'old-session', 'user_id' => $user->id, 'payload' => 'test', 'last_activity' => time()]);
        $token = Password::createToken($user);
        $payload = ['email' => $user->email, 'token' => $token, 'password' => 'New-Password-43!', 'password_confirmation' => 'New-Password-43!'];
        $this->postJson('/api/v1/auth/reset-password', $payload)->assertOk();
        $this->assertTrue(Hash::check($payload['password'], $user->fresh()->password));
        $this->assertEquals(0, $user->tokens()->count());
        $this->assertDatabaseMissing('sessions', ['id' => 'old-session']);
        $this->postJson('/api/v1/auth/reset-password', $payload)->assertUnprocessable()->assertJsonPath('code', 'invalid_reset_token');
    }

    public function test_expired_reset_token_cannot_change_password(): void
    {
        $user = $this->createUser();
        $token = Password::createToken($user);
        DB::table('password_reset_tokens')->where('email', $user->email)->update(['created_at' => now()->subHours(2)]);
        $this->postJson('/api/v1/auth/reset-password', ['email' => $user->email, 'token' => $token,
            'password' => 'New-Password-43!', 'password_confirmation' => 'New-Password-43!'])->assertUnprocessable();
        $this->assertTrue(Hash::check(self::PASSWORD, $user->fresh()->password));
    }

    public function test_profile_update_cannot_escalate_role_or_replace_email(): void
    {
        $user = $this->createUser();
        $this->asToken($user)->patchJson('/api/v1/me', ['name' => 'Yeni Ad'])->assertOk()->assertJsonPath('data.name', 'Yeni Ad');
        $this->patchJson('/api/v1/me', ['name' => 'Yeni Ad', 'platform_role' => 'platform_admin', 'email' => 'other@example.test'])
            ->assertUnprocessable();
        $this->assertEquals('student', $user->fresh()->platform_role);
        $this->assertDatabaseCount('study_contexts', 1);
    }

    public function test_malformed_email_is_validation_error(): void
    {
        $this->postJson('/api/v1/auth/mobile-tokens', ['email' => ['bad'], 'password' => self::PASSWORD, 'device_id' => Str::uuid()])
            ->assertUnprocessable()->assertJsonPath('code', 'validation_failed');
    }

    public function test_token_without_api_ability_is_rejected(): void
    {
        $user = $this->createUser();
        $token = $user->createToken('no-permission', [], now()->addHour())->plainTextToken;
        $this->withToken($token)->getJson('/api/v1/me')->assertForbidden();
    }

    public function test_password_changed_after_initial_login_check_cannot_mint_a_token(): void
    {
        $user = $this->createUser();
        $action = \Mockery::mock(AuthenticateUser::class);
        $action->shouldReceive('execute')->once()->andReturnUsing(function () use ($user) {
            DB::table('users')->where('id', $user->id)->update(['password' => Hash::make('Changed-Password-99!')]);

            return $user;
        });
        $this->app->instance(AuthenticateUser::class, $action);
        $this->postJson('/api/v1/auth/mobile-tokens', ['email' => $user->email, 'password' => self::PASSWORD, 'device_id' => Str::uuid()])
            ->assertUnauthorized()->assertJsonPath('code', 'invalid_credentials');
        $this->assertEquals(0, $user->tokens()->count());
    }

    public function test_admin_command_creates_a_separate_personal_context_without_default_credentials(): void
    {
        $this->artisan('app:create-admin', ['email' => 'operator@example.test', '--name' => 'Test Operator'])
            ->expectsQuestion('Parola', self::PASSWORD)->expectsQuestion('Parola tekrar', self::PASSWORD)->assertExitCode(0);
        $user = User::where('email', 'operator@example.test')->firstOrFail();
        $this->assertTrue($user->isPlatformAdmin());
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertEquals(1, $user->studyContexts()->count());
    }
}
