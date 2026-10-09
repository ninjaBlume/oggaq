<?php

use App\Modules\Identity\Http\Controllers\AuthController;
use App\Modules\Identity\Http\Controllers\ProfileController;
use App\Modules\Tenancy\Http\Controllers\MembershipController;
use App\Modules\Tenancy\Http\Controllers\StudyContextController;
use App\Modules\Tenancy\Http\Controllers\TenantController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:registration');
    Route::post('auth/mobile-tokens', [AuthController::class, 'mobileToken'])->middleware('throttle:login');
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:password');
    Route::post('auth/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:password');

    Route::middleware(['auth:sanctum', 'account.active', 'abilities:api:access', 'throttle:api'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/email-verification-notification', [AuthController::class, 'resendVerification'])->middleware('throttle:verification');
        Route::get('me', [ProfileController::class, 'show']);
        Route::patch('me', [ProfileController::class, 'update']);

        Route::middleware('email.verified')->group(function () {
            Route::get('me/contexts', [StudyContextController::class, 'index']);
            Route::get('contexts/{context}', [StudyContextController::class, 'show'])->whereUuid('context');
            Route::get('admin/tenants', [TenantController::class, 'index']);
            Route::post('admin/tenants', [TenantController::class, 'store']);
            Route::get('tenants/{tenant}/profile', [TenantController::class, 'show'])->whereUuid('tenant');
            Route::get('tenants/{tenant}/memberships', [MembershipController::class, 'index'])->whereUuid('tenant');
            Route::get('tenants/{tenant}/memberships/{membership}', [MembershipController::class, 'show'])->whereUuid(['tenant', 'membership']);
            Route::post('admin/tenants/{tenant}/memberships', [MembershipController::class, 'store'])->whereUuid('tenant');
            Route::delete('admin/tenants/{tenant}/memberships/{membership}', [MembershipController::class, 'destroy'])->whereUuid(['tenant', 'membership']);
        });
    });
});
