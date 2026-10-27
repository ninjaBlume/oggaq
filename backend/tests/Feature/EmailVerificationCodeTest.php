<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Identity\Actions\DeleteAccount;
use App\Modules\Identity\Actions\EmailVerificationCodes;
use App\Modules\Identity\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmailVerificationCodeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    private function pending(): array
    {
        $user = $this->createUser(['email_verified_at' => null]);
        $user->sendEmailVerificationNotification();

        return [$user, Notification::sent($user, VerifyEmailNotification::class)->last()->code];
    }

    public function test_registration_sends_no_mail_and_code_is_only_created_on_explicit_request(): void
    {
        $response = $this->postJson('/api/v1/auth/register', ['name' => 'Synthetic Student', 'email' => 'new-code@example.test',
            'password' => self::PASSWORD, 'password_confirmation' => self::PASSWORD])->assertCreated()->assertJsonMissingPath('data.code');
        $user = User::findOrFail($response->json('data.id'));
        Notification::assertNothingSent();
        $this->assertDatabaseCount('email_verification_codes', 0);
        $this->asToken($user)->getJson('/api/v1/me/contexts')->assertOk();
        $this->postJson('/api/v1/auth/email-verification-notification')->assertOk();
        $notification = Notification::sent($user, VerifyEmailNotification::class)->sole();
        $this->assertMatchesRegularExpression('/^[0-9]{6}$/', $notification->code);
        $record = DB::table('email_verification_codes')->where('user_id', $user->id)->first();
        $this->assertNotSame($notification->code, $record->code_hash);
        $this->assertNotSame(hash('sha256', $notification->code), $record->code_hash);
        $this->assertStringContainsString($notification->code, implode(' ', $notification->toMail($user)->introLines));
        $this->assertTrue($notification->shouldSend($user, 'mail'));
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_valid_code_verifies_current_account_and_unlocks_content_without_a_new_login(): void
    {
        [$user, $code] = $this->pending();
        $this->asToken($user)->postJson('/api/v1/auth/email-verification-code', ['code' => $code])->assertOk()
            ->assertJsonPath('data.id', $user->id)->assertJsonMissingPath('data.token');
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertDatabaseMissing('email_verification_codes', ['user_id' => $user->id]);
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/me/contexts')->assertOk();
        $this->postJson('/api/v1/auth/email-verification-code', ['code' => $code])->assertOk();
    }

    public function test_code_cannot_verify_another_account_and_body_identity_injection_is_rejected(): void
    {
        [$owner, $code] = $this->pending();
        $other = $this->createUser(['email_verified_at' => null]);
        $this->asToken($other)->postJson('/api/v1/auth/email-verification-code', ['code' => $code])->assertUnprocessable();
        $this->postJson('/api/v1/auth/email-verification-code', ['code' => $code, 'user_id' => $owner->id])->assertUnprocessable();
        $this->assertNull($owner->fresh()->email_verified_at);
        $this->assertNull($other->fresh()->email_verified_at);
    }

    public function test_wrong_attempts_remain_counted_and_lock_even_the_right_code_after_five_guesses(): void
    {
        [$user, $code] = $this->pending();
        $this->asToken($user);
        $wrong = $code === '000000' ? '111111' : '000000';
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/email-verification-code', ['code' => $wrong])->assertUnprocessable();
        }
        $this->assertDatabaseHas('email_verification_codes', ['user_id' => $user->id, 'failed_attempts' => 5]);
        $this->postJson('/api/v1/auth/email-verification-code', ['code' => $code])->assertStatus(429)->assertJsonPath('code', 'verification_locked');
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_expired_code_and_malformed_input_are_rejected(): void
    {
        [$user, $code] = $this->pending();
        $this->asToken($user);
        foreach (['12345', '1234567', 'abcdef', 123456] as $invalid) {
            $this->postJson('/api/v1/auth/email-verification-code', ['code' => $invalid])->assertUnprocessable();
        }
        $this->travel(10)->minutes();
        $this->postJson('/api/v1/auth/email-verification-code', ['code' => $code])->assertUnprocessable();
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_resend_cooldown_preserves_previous_code_then_replaces_it_and_blocks_stale_queued_mail(): void
    {
        [$user, $first] = $this->pending();
        $oldMail = Notification::sent($user, VerifyEmailNotification::class)->last();
        $this->asToken($user)->postJson('/api/v1/auth/email-verification-notification')->assertStatus(429);
        $this->assertTrue(app(EmailVerificationCodes::class)->isCurrent($user, $first));
        $this->travel(61)->seconds();
        $this->postJson('/api/v1/auth/email-verification-notification')->assertOk();
        $second = Notification::sent($user, VerifyEmailNotification::class)->last()->code;
        $this->assertNotSame($first, $second);
        $this->assertFalse($oldMail->shouldSend($user, 'mail'));
        $this->postJson('/api/v1/auth/email-verification-code', ['code' => $first])->assertUnprocessable();
        $this->postJson('/api/v1/auth/email-verification-code', ['code' => $second])->assertOk();
    }

    public function test_code_is_bound_to_email_and_is_removed_with_account(): void
    {
        [$user, $code] = $this->pending();
        $user->forceFill(['email' => 'changed-code@example.test'])->save();
        $this->asToken($user)->postJson('/api/v1/auth/email-verification-code', ['code' => $code])->assertUnprocessable();
        app(DeleteAccount::class)->execute($user);
        $this->assertDatabaseMissing('email_verification_codes', ['user_id' => $user->id]);
    }

    public function test_anonymous_suspended_and_wrong_ability_tokens_cannot_confirm(): void
    {
        [$user, $code] = $this->pending();
        $body = ['code' => $code];
        $this->postJson('/api/v1/auth/email-verification-code', $body)->assertUnauthorized();
        $token = $user->createToken('wrong', ['unrelated'], now()->addHour())->plainTextToken;
        $this->withToken($token)->postJson('/api/v1/auth/email-verification-code', $body)->assertForbidden();
        $user->forceFill(['status' => 'suspended'])->save();
        $this->asToken($user)->postJson('/api/v1/auth/email-verification-code', $body)->assertForbidden();
        $this->assertNull($user->fresh()->email_verified_at);
    }
}
