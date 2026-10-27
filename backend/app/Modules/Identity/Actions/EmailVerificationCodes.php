<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\Notifications\VerifyEmailNotification;
use App\Support\ApiProblem;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;

// Address confirmation only: codes never issue a session or replace the account password.
class EmailVerificationCodes
{
    public function send(User $actor): void
    {
        DB::transaction(function () use ($actor) {
            $user = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            if ($user->hasVerifiedEmail() || $user->status !== 'active') {
                return;
            }
            $previous = DB::table('email_verification_codes')->where('user_id', $user->id)->first();
            if ($previous && now()->subSeconds(60)->lt($previous->sent_at)) {
                throw new ApiProblem(429, 'verification_cooldown', 'Yeni kod istemek için bir dakika bekle.');
            }
            do {
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            } while ($previous && hash_equals($previous->code_hash, $this->digest($user, $code)));
            DB::table('email_verification_codes')->updateOrInsert(['user_id' => $user->id], [
                'code_hash' => $this->digest($user, $code), 'failed_attempts' => 0,
                'sent_at' => now(), 'expires_at' => now()->addMinutes(10),
            ]);
            // The queue payload is encrypted and dispatched only after the transaction commits.
            $user->notify(new VerifyEmailNotification($code));
        });
    }

    public function verify(User $actor, string $code): User
    {
        $result = DB::transaction(function () use ($actor, $code) {
            $user = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            if ($user->status !== 'active') {
                throw new ApiProblem(403, 'account_inactive', 'Bu hesap aktif değil.');
            }
            if ($user->hasVerifiedEmail()) {
                return $user;
            }
            $record = DB::table('email_verification_codes')->where('user_id', $user->id)->first();
            if (! $record || now()->gte($record->expires_at)) {
                return 'invalid';
            }
            if ($record->failed_attempts >= 5) {
                return 'locked';
            }
            if (! hash_equals($record->code_hash, $this->digest($user, $code))) {
                DB::table('email_verification_codes')->where('user_id', $user->id)->increment('failed_attempts');

                return 'invalid';
            }
            $user->markEmailAsVerified();
            DB::table('email_verification_codes')->where('user_id', $user->id)->delete();
            DB::afterCommit(fn () => event(new Verified($user)));

            return $user;
        });
        // Throw outside the transaction so failed guesses remain counted.
        if ($result === 'locked') {
            throw new ApiProblem(429, 'verification_locked', 'Bu kod için deneme sınırına ulaştın. Yeni kod iste.');
        }
        if ($result === 'invalid') {
            throw new ApiProblem(422, 'invalid_verification_code', 'Kod hatalı veya süresi dolmuş. Kontrol et ya da yeni kod iste.');
        }

        return $result;
    }

    public function isCurrent(User $user, string $code): bool
    {
        $record = DB::table('email_verification_codes')->where('user_id', $user->id)->first();

        return $user->status === 'active' && ! $user->hasVerifiedEmail() && $record
            && now()->lt($record->expires_at) && $record->failed_attempts < 5
            && hash_equals($record->code_hash, $this->digest($user, $code));
    }

    private function digest(User $user, string $code): string
    {
        return hash_hmac('sha256', $user->id.'|'.$user->email.'|'.$code, config('app.key'));
    }
}
