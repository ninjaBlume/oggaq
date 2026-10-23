<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\Notifications\PasswordChangedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ChangePassword
{
    public function __construct(private UserSessions $sessions) {}

    // The new password signs every other device out; the one being used stays signed in.
    public function execute(User $actor, string $password, Request $request): void
    {
        $user = DB::transaction(function () use ($actor, $password, $request) {
            $locked = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $locked->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
            $this->sessions->revokeOthers($locked, $request);
            if ($request->hasSession()) {
                $request->session()->put('password_hash_web', Auth::guard('web')->hashPasswordForCookie($locked->getAuthPassword()));
            }

            return $locked;
        });
        // Sanctum's session middleware stores the password hash of the request's user after the response; that instance
        // must carry the new password or this very session would be signed out by its own change.
        $actor->refresh();
        $user->notify(new PasswordChangedNotification);
    }
}
