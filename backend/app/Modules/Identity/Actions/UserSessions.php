<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Support\UserAgentLabel;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

// The places a user is signed in: bearer tokens of the mobile app and, when sessions live in the database, browser
// sessions. Ids shown to clients are opaque: the real session id is a credential-adjacent secret and never leaves.
class UserSessions
{
    public function list(User $user, Request $request): array
    {
        $currentToken = $this->currentTokenId($request);
        $currentSession = $request->hasSession() ? $request->session()->getId() : null;
        $items = [];
        foreach ($user->tokens()->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))->get() as $token) {
            $items[] = [
                'id' => 'mobile-'.$token->id, 'kind' => 'mobile', 'label' => $token->device_label ?? 'Mobil uygulama',
                'created_at' => $token->created_at?->toISOString(), 'last_used_at' => $token->last_used_at?->toISOString(),
                'expires_at' => $token->expires_at?->toISOString(), 'current' => $currentToken === $token->id,
            ];
        }
        foreach ($this->webSessions($user) as $row) {
            $items[] = [
                'id' => $this->webId($row->id), 'kind' => 'web', 'label' => UserAgentLabel::describe($row->user_agent),
                'created_at' => null, 'last_used_at' => Carbon::createFromTimestamp($row->last_activity)->toISOString(),
                'expires_at' => Carbon::createFromTimestamp($row->last_activity)->addMinutes((int) config('session.lifetime'))->toISOString(),
                'current' => $currentSession !== null && $row->id === $currentSession,
            ];
        }
        if ($currentSession !== null && $currentToken === null && config('session.driver') !== 'database') {
            // Other drivers cannot list sessions; the one in use is still shown so the page is never empty.
            $items[] = ['id' => $this->webId($currentSession), 'kind' => 'web', 'label' => UserAgentLabel::describe($request->userAgent()), 'created_at' => null, 'last_used_at' => now()->toISOString(), 'expires_at' => null, 'current' => true];
        }
        usort($items, fn ($a, $b) => [$b['current'], $b['last_used_at']] <=> [$a['current'], $a['last_used_at']]);

        return $items;
    }

    // False when the user has no such session (never reveals other users' sessions).
    public function revoke(User $user, string $publicId, Request $request): bool
    {
        if (preg_match('~^mobile-(\d+)$~', $publicId, $match)) {
            return $user->tokens()->whereKey((int) $match[1])->delete() > 0;
        }
        if (preg_match('~^web-[0-9a-f]{32}$~', $publicId)) {
            foreach ($this->webSessions($user) as $row) {
                if (hash_equals($this->webId($row->id), $publicId)) {
                    return DB::table('sessions')->where('id', $row->id)->where('user_id', $user->id)->delete() > 0;
                }
            }
        }

        return false;
    }

    // Everything except what this request is using.
    public function revokeOthers(User $user, Request $request): array
    {
        $currentToken = $this->currentTokenId($request);
        $tokens = $user->tokens()->when($currentToken !== null, fn ($query) => $query->whereKeyNot($currentToken))->delete();
        $web = DB::table('sessions')->where('user_id', $user->id)
            ->when($request->hasSession(), fn ($query) => $query->where('id', '!=', $request->session()->getId()))->delete();

        return ['tokens' => $tokens, 'web_sessions' => $web];
    }

    private function currentTokenId(Request $request): ?int
    {
        $token = $request->user()?->currentAccessToken();

        return $token instanceof PersonalAccessToken ? $token->id : null;
    }

    private function webSessions(User $user): array
    {
        if (config('session.driver') !== 'database') {
            return [];
        }
        $oldest = now()->subMinutes((int) config('session.lifetime'))->getTimestamp();

        return DB::table('sessions')->where('user_id', $user->id)->where('last_activity', '>=', $oldest)->get(['id', 'user_agent', 'last_activity'])->all();
    }

    private function webId(string $sessionId): string
    {
        return 'web-'.substr(hash_hmac('sha256', $sessionId, (string) config('app.key')), 0, 32);
    }
}
