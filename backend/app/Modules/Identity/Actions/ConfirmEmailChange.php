<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\Notifications\EmailChangeNoticeNotification;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class ConfirmEmailChange
{
    // Opening the signed link in the signed-in browser proves the NEW address is read by the account owner.
    public function execute(User $actor, string $hash): User
    {
        $old = $actor->email;
        $user = DB::transaction(function () use ($actor, $hash) {
            $locked = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            if ($locked->pending_email === null || ! hash_equals(sha1($locked->pending_email), $hash)) {
                throw new ApiProblem(422, 'invalid_email_change', 'Bu e-posta değişikliği bağlantısı geçersiz veya yenilenmiş.');
            }
            if (User::where('email', $locked->pending_email)->whereKeyNot($locked->id)->exists()) {
                throw new ApiProblem(409, 'email_taken', 'Bu e-posta adresi artık kullanılamıyor. Başka bir adres dene.');
            }
            $new = $locked->pending_email;
            $locked->forceFill(['email' => $new, 'email_verified_at' => now(), 'pending_email' => null, 'pending_email_requested_at' => null])->save();

            return $locked;
        });
        Notification::route('mail', $old)->notify(new EmailChangeNoticeNotification(RequestEmailChange::mask($user->email), true));

        return $user;
    }
}
