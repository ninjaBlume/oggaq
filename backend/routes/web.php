<?php

use App\Modules\Identity\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;

Route::get('/', function () {
    return response()->json(['data' => ['service' => 'security-exam-platform', 'api_version' => 'v1']]);
});

Route::post('/api/v1/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::get('/api/v1/auth/verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware([AuthenticateSession::class, 'auth:sanctum', 'account.active', 'abilities:api:access', 'signed', 'throttle:verification'])
    ->name('verification.verify');
