<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Actions\ChangePassword;
use App\Modules\Identity\Actions\ConfirmEmailChange;
use App\Modules\Identity\Actions\DeleteAccount;
use App\Modules\Identity\Actions\ExportAccountData;
use App\Modules\Identity\Actions\RequestEmailChange;
use App\Modules\Identity\Actions\UserSessions;
use App\Modules\Identity\Http\Requests\ChangeEmailRequest;
use App\Modules\Identity\Http\Requests\ChangePasswordRequest;
use App\Modules\Identity\Http\Requests\ConfirmPasswordRequest;
use App\Modules\Identity\Http\Requests\DeleteAccountRequest;
use App\Modules\Identity\Http\Resources\UserResource;
use App\Support\ApiProblem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AccountController extends Controller
{
    public function sessions(Request $request, UserSessions $sessions): JsonResponse
    {
        return response()->json(['data' => $sessions->list($request->user(), $request)]);
    }

    public function revokeSession(Request $request, string $session, UserSessions $sessions): JsonResponse
    {
        if (! $sessions->revoke($request->user(), $session, $request)) {
            throw new ApiProblem(404, 'session_not_found', 'Oturum bulunamadı.');
        }

        return response()->json(['data' => ['message' => 'Oturum kapatıldı.']]);
    }

    public function revokeOthers(ConfirmPasswordRequest $request, UserSessions $sessions): JsonResponse
    {
        $result = $sessions->revokeOthers($request->user(), $request);

        return response()->json(['data' => ['revoked' => $result['tokens'] + $result['web_sessions'], 'message' => 'Diğer cihazlardaki oturumlar kapatıldı.']]);
    }

    public function password(ChangePasswordRequest $request, ChangePassword $action): JsonResponse
    {
        $action->execute($request->user(), $request->validated('password'), $request);
        $this->audit($request, 'account.password_changed');

        return response()->json(['data' => ['message' => 'Parolan değiştirildi; diğer cihazlardaki oturumlar kapatıldı.']]);
    }

    public function email(ChangeEmailRequest $request, RequestEmailChange $action): JsonResponse
    {
        $action->execute($request->user(), $request->validated('email'));

        return response()->json(['data' => ['message' => 'Adres doğrulanabilirse yeni adrese bir doğrulama bağlantısı gönderilecektir. Bağlantı açılana kadar e-posta adresin değişmez.']], 202);
    }

    public function confirmEmail(Request $request, string $id, string $hash, ConfirmEmailChange $action): UserResource
    {
        if (! hash_equals($id, (string) $request->user()->getKey())) {
            throw new ApiProblem(403, 'wrong_account', 'Bu bağlantı başka bir hesaba ait. Doğru hesapla giriş yapıp tekrar aç.');
        }
        $user = $action->execute($request->user(), $hash);
        $this->audit($request, 'account.email_changed');

        return new UserResource($user);
    }

    public function export(ConfirmPasswordRequest $request, ExportAccountData $action): StreamedResponse
    {
        // The daily allowance is spent only by exports that passed the password check (wrong passwords are throttled separately).
        if (! RateLimiter::attempt('account-export:'.$request->user()->id, 3, fn () => true, 86400)) {
            throw new ApiProblem(429, 'export_limit', 'Verilerini günde en fazla 3 kez indirebilirsin. Yarın tekrar dene.');
        }
        $this->audit($request, 'account.exported');
        $user = $request->user();

        return response()->streamDownload(fn () => $action->write($user, $request, function (string $chunk) {
            echo $chunk;
            if (connection_status() !== CONNECTION_NORMAL) {
                return;
            }
            flush();
        }), $action->filename(), ['Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store']);
    }

    public function destroy(DeleteAccountRequest $request, DeleteAccount $action): JsonResponse
    {
        $action->execute($request->user());
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['data' => ['message' => 'Hesabın ve çalışma geçmişin silindi.']]);
    }

    private function audit(Request $request, string $action): void
    {
        DB::table('audit_events')->insert(['id' => Str::uuid(), 'actor_id' => $request->user()->id, 'tenant_id' => null, 'target_id' => $request->user()->id, 'action' => $action, 'created_at' => now()]);
    }
}
