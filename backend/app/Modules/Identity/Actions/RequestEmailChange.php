<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\Notifications\ConfirmEmailChangeNotification;
use App\Modules\Identity\Notifications\EmailChangeNoticeNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class RequestEmailChange
{
    // Always looks the same from outside: an address another account uses gets no pending change and no mail.
    public function execute(User $actor, string $email): void
    {
        if (User::where('email', $email)->whereKeyNot($actor->id)->exists()) {
            return;
        }
        DB::transaction(fn () => User::whereKey($actor->id)->lockForUpdate()->update(['pending_email' => $email, 'pending_email_requested_at' => now()]));
        Notification::route('mail', $email)->notify(new ConfirmEmailChangeNotification($actor->id, $email));
        $actor->notify(new EmailChangeNoticeNotification(self::mask($email), false));
    }

    public static function mask(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return mb_substr($local, 0, 1).'***@'.$domain;
    }
}
