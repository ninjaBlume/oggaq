<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\AccountErasureLedger;
use App\Modules\Identity\Notifications\AccountDeletedNotification;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

// Erases a person: their study history, memberships, sessions and the account itself, in one transaction.
// Kept on purpose: audit events lose their actor, and question reports lose reporter and note (they are about the question).
// The database refuses to delete finished exam answers; this action alone lifts that for the length of its own
// transaction through the `oggaq.account_erasure` setting and always puts it back.
class DeleteAccount
{
    public function execute(User $actor): void
    {
        $email = $actor->email;
        DB::transaction(function () use ($actor) {
            $user = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $this->assertDeletable($user);
            // Written in the same transaction: either the person is erased and on the list, or nothing happened.
            AccountErasureLedger::record($user->id, now());
            $this->erasePersonalData($user);
        });
        // Only the old address is left to say goodbye to; the queue payload is encrypted and sent after commit.
        Notification::route('mail', $email)->notify(new AccountDeletedNotification);
    }

    private function assertDeletable(User $user): void
    {
        if ($user->platform_role === 'platform_admin') {
            throw new ApiProblem(409, 'admin_account', 'Platform yöneticisi hesabı kendi kendine silinemez. Önce başka bir yönetici yetkini kaldırmalı.');
        }
        $onlyAdminOf = DB::table('memberships as m')->where('m.user_id', $user->id)->where('m.role', 'company_admin')->where('m.status', 'active')
            ->whereNotExists(fn ($other) => $other->selectRaw('1')->from('memberships as o')->whereColumn('o.tenant_id', 'm.tenant_id')
                ->where('o.role', 'company_admin')->where('o.status', 'active')->whereColumn('o.user_id', '!=', 'm.user_id'))->exists();
        if ($onlyAdminOf) {
            throw new ApiProblem(409, 'last_company_admin', 'Bir kurumun tek yöneticisi hesabını silemez. Önce başka bir kurum yöneticisi atanmalı.');
        }
    }

    // The one place that lifts the database's refusal to delete finished answers, for the length of the caller's transaction.
    // Also used after a restore to remove accounts that had been erased before the backup was taken.
    public function erasePersonalData(User $user): void
    {
        DB::statement("select set_config('oggaq.account_erasure', 'on', true)");
        try {
            $this->erase($user);
        } finally {
            DB::statement("select set_config('oggaq.account_erasure', 'off', true)");
        }
    }

    private function erase(User $user): void
    {
        $contexts = DB::table('study_contexts')->where('user_id', $user->id)->pluck('id')->all();
        $attempts = DB::table('exam_attempts')->whereIn('study_context_id', $contexts)->select('id');
        // Reports are about the question: the link to the person and their free text go, the rest stays.
        DB::table('question_reports')->where('user_id', $user->id)->update(['user_id' => null, 'note' => null]);
        DB::table('question_reports')->whereIn('exam_attempt_id', $attempts)->update(['exam_attempt_id' => null]);
        DB::table('exam_answers')->whereIn('exam_attempt_id', $attempts)->delete();
        DB::table('exam_attempts')->whereIn('study_context_id', $contexts)->delete();
        DB::table('practice_attempts')->whereIn('study_context_id', $contexts)->delete();
        DB::table('favorite_questions')->whereIn('study_context_id', $contexts)->delete();
        DB::table('study_contexts')->where('user_id', $user->id)->delete();
        DB::table('memberships')->where('user_id', $user->id)->delete();
        DB::table('sessions')->where('user_id', $user->id)->delete();
        $user->tokens()->delete();
        DB::table('password_reset_tokens')->where('email', $user->email)->delete();
        // Audit events stay; the person no longer can be found through them.
        DB::table('audit_events')->where('actor_id', $user->id)->update(['actor_id' => null]);
        DB::table('audit_events')->where('target_id', $user->id)->update(['target_id' => DB::raw('gen_random_uuid()')]);
        DB::table('audit_events')->insert(['id' => Str::uuid(), 'actor_id' => null, 'tenant_id' => null, 'target_id' => Str::uuid(), 'action' => 'account.deleted', 'created_at' => now()]);
        DB::table('users')->where('id', $user->id)->delete();
    }
}
