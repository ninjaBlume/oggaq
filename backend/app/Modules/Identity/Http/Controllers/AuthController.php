<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Actions\AuthenticateUser;
use App\Modules\Identity\Actions\RegisterUser;
use App\Modules\Identity\Actions\ResetUserPassword;
use App\Modules\Identity\Http\Requests\ForgotPasswordRequest;
use App\Modules\Identity\Http\Requests\LoginRequest;
use App\Modules\Identity\Http\Requests\MobileTokenRequest;
use App\Modules\Identity\Http\Requests\RegisterRequest;
use App\Modules\Identity\Http\Requests\ResetPasswordRequest;
use App\Modules\Identity\Http\Resources\UserResource;
use App\Support\ApiProblem;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function register(RegisterRequest $request, RegisterUser $action): JsonResponse
    {
        $user = $action->execute($request->safe()->only(['name', 'email', 'password']));

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function login(LoginRequest $request, AuthenticateUser $action): UserResource
    {
        $user = $action->execute($request->validated());
        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $request->session()->put('password_hash_web', Auth::guard('web')->hashPasswordForCookie($user->getAuthPassword()));

        return new UserResource($user);
    }

    public function mobileToken(MobileTokenRequest $request, AuthenticateUser $action): JsonResponse
    {
        $user = $action->execute($request->safe()->only(['email', 'password']));
        $expiresAt = now()->addMinutes(max(1, min(10080, config('security.mobile_token_minutes'))));
        $token = DB::transaction(function () use ($user, $request, $expiresAt) {
            $locked = $user->newQuery()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'active' || ! Hash::check($request->validated('password'), $locked->password)) {
                throw new ApiProblem(401, 'invalid_credentials', 'E-posta adresi veya parola hatalı.');
            }
            $name = 'device:'.$request->validated('device_id');
            $locked->tokens()->where('name', $name)->delete();

            return $locked->createToken($name, ['api:access'], $expiresAt)->plainTextToken;
        });

        return response()->json(['data' => [
            'token' => $token, 'token_type' => 'Bearer', 'expires_at' => $expiresAt->toISOString(),
            'user' => (new UserResource($user))->resolve($request),
        ]], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        } else {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['data' => ['message' => 'Oturum kapatıldı.']]);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->validated());

        return response()->json(['data' => ['message' => 'Hesap mevcutsa parola sıfırlama bağlantısı gönderilecektir.']]);
    }

    public function resetPassword(ResetPasswordRequest $request, ResetUserPassword $action): JsonResponse
    {
        $action->execute($request->safe()->only(['email', 'token', 'password', 'password_confirmation']));
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['data' => ['message' => 'Parolanız sıfırlandı. Yeniden giriş yapın.']]);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        if (! $request->user()->hasVerifiedEmail()) {
            $request->user()->sendEmailVerificationNotification();
        }

        return response()->json(['data' => ['message' => 'Gerekliyse doğrulama e-postası gönderilecektir.']]);
    }

    public function verifyEmail(EmailVerificationRequest $request): JsonResponse
    {
        $request->fulfill();

        return response()->json(['data' => ['message' => 'E-posta adresiniz doğrulandı.']]);
    }
}
