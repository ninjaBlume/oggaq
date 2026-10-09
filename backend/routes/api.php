<?php

use App\Modules\Identity\Http\Controllers\AuthController;
use App\Modules\Identity\Http\Controllers\ProfileController;
use App\Modules\QuestionBank\Http\Controllers\AdminQuestionController;
use App\Modules\QuestionBank\Http\Controllers\CatalogController;
use App\Modules\QuestionBank\Http\Controllers\QuestionController;
use App\Modules\Study\Http\Controllers\PracticeAttemptController;
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
            foreach (['subjects', 'exam-types'] as $catalog) {
                Route::get($catalog, [CatalogController::class, 'index'])->defaults('catalog', $catalog);
            }
            Route::get('subjects/{subject}/topics', [CatalogController::class, 'index'])->whereUuid('subject')->defaults('catalog', 'topics');
            foreach (['subjects', 'topics', 'exam-types', 'question-sources'] as $catalog) {
                Route::get('admin/'.$catalog, [CatalogController::class, 'index'])->defaults('catalog', $catalog);
                Route::post('admin/'.$catalog, [CatalogController::class, 'store'])->defaults('catalog', $catalog);
            }
            Route::get('admin/questions', [AdminQuestionController::class, 'index']);
            Route::post('admin/questions', [AdminQuestionController::class, 'store']);
            Route::get('admin/questions/{question}', [AdminQuestionController::class, 'show'])->whereUuid('question');
            Route::patch('admin/questions/{question}', [AdminQuestionController::class, 'update'])->whereUuid('question');
            Route::post('admin/questions/{question}/publish', [AdminQuestionController::class, 'publish'])->whereUuid('question');
            Route::get('admin/questions/{question}/versions', [AdminQuestionController::class, 'versions'])->whereUuid('question');
            Route::get('questions', [QuestionController::class, 'index']);
            Route::get('questions/{question}', [QuestionController::class, 'show'])->whereUuid('question');
            Route::get('contexts/{context}/practice-attempts', [PracticeAttemptController::class, 'index'])->whereUuid('context');
            Route::post('contexts/{context}/practice-attempts', [PracticeAttemptController::class, 'store'])->whereUuid('context');
            Route::get('contexts/{context}/practice-attempts/{attempt}', [PracticeAttemptController::class, 'show'])->whereUuid(['context', 'attempt']);
            Route::post('contexts/{context}/practice-attempts/{attempt}/answer', [PracticeAttemptController::class, 'answer'])->whereUuid(['context', 'attempt']);
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
