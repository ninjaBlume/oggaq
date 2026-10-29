<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PrivacyNotice
{
    public static function rules(): array
    {
        // Rolling compatibility: an old binary must not fabricate a receipt or lose registration access.
        return ['sometimes', 'required', 'string', Rule::in(array_keys(config('privacy_notices')))];
    }

    public static function record(User $user, string $scope, ?string $version): void
    {
        if ($version === null) {
            return;
        }
        $hash = config('privacy_notices')[$version] ?? null;
        if (! is_string($hash)) {
            throw new \LogicException('Unknown privacy notice version');
        }
        // This records which notice the client says it supplied, not reading, consent or transfer permission.
        DB::table('privacy_notice_receipts')->insertOrIgnore([
            'id' => (string) Str::uuid(), 'user_id' => $user->id, 'scope' => $scope,
            'notice_version' => $version, 'content_hash' => $hash, 'recorded_at' => now(),
        ]);
    }
}
