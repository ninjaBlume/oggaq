<?php

use App\Modules\Exams\Http\Controllers\ExamAttemptController;
use App\Modules\Identity\Http\Controllers\AccountController;
use App\Modules\Identity\Http\Controllers\AuthController;
use App\Modules\Identity\Http\Controllers\ProfileController;
use App\Modules\QuestionBank\Http\Controllers\AdminOfficialExamController;
use App\Modules\QuestionBank\Http\Controllers\AdminQuestionController;
use App\Modules\QuestionBank\Http\Controllers\AdminQuestionReportController;
use App\Modules\QuestionBank\Http\Controllers\CatalogController;
use App\Modules\QuestionBank\Http\Controllers\OfficialExamController;
use App\Modules\QuestionBank\Http\Controllers\QuestionController;
use App\Modules\Study\Http\Controllers\PracticeAttemptController;
use App\Modules\Study\Http\Controllers\ReviewController;
use App\Modules\Study\Http\Controllers\StatsController;
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
        // Account lifecycle: reachable without a verified e-mail (a mistyped address must be fixable).
        Route::get('me/sessions', [AccountController::class, 'sessions']);
        Route::delete('me/sessions/{session}', [AccountController::class, 'revokeSession'])->middleware('throttle:account');
        Route::post('me/sessions/revoke-others', [AccountController::class, 'revokeOthers'])->middleware('throttle:account');
        Route::post('me/password', [AccountController::class, 'password'])->middleware('throttle:account');
        Route::post('me/email', [AccountController::class, 'email'])->middleware('throttle:account');
        Route::post('me/export', [AccountController::class, 'export'])->middleware('throttle:account');
        Route::delete('me', [AccountController::class, 'destroy'])->middleware('throttle:account');

        Route::middleware('email.verified')->group(function () {
            foreach (['subjects', 'exam-types'] as $catalog) {
                Route::get($catalog, [CatalogController::class, 'index'])->defaults('catalog', $catalog);
            }
            Route::get('subjects/{subject}/topics', [CatalogController::class, 'index'])->whereUuid('subject')->defaults('catalog', 'topics');
            foreach (['subjects', 'topics', 'exam-types', 'question-sources'] as $catalog) {
                Route::get('admin/'.$catalog, [CatalogController::class, 'index'])->defaults('catalog', $catalog);
                Route::post('admin/'.$catalog, [CatalogController::class, 'store'])->defaults('catalog', $catalog);
            }
            Route::get('admin/question-stats', [AdminQuestionController::class, 'stats']);
            Route::get('admin/subjects/{subject}/exam-stats', [AdminQuestionController::class, 'subjectExamStats'])->whereUuid('subject');
            Route::get('admin/questions', [AdminQuestionController::class, 'index']);
            Route::post('admin/questions', [AdminQuestionController::class, 'store']);
            Route::get('admin/questions/{question}', [AdminQuestionController::class, 'show'])->whereUuid('question');
            Route::patch('admin/questions/{question}', [AdminQuestionController::class, 'update'])->whereUuid('question');
            Route::post('admin/questions/{question}/publish', [AdminQuestionController::class, 'publish'])->whereUuid('question');
            Route::post('admin/questions/{question}/apply-to-exams', [AdminQuestionController::class, 'applyToExams'])->whereUuid('question');
            Route::get('admin/questions/{question}/versions', [AdminQuestionController::class, 'versions'])->whereUuid('question');
            Route::get('admin/question-reports', [AdminQuestionReportController::class, 'index']);
            Route::get('admin/question-reports/summary', [AdminQuestionReportController::class, 'summary']);
            Route::post('admin/question-reports/{question}/resolve', [AdminQuestionReportController::class, 'resolve'])->whereUuid('question');
            Route::get('admin/official-exams', [AdminOfficialExamController::class, 'index']);
            Route::post('admin/official-exams', [AdminOfficialExamController::class, 'store']);
            Route::get('admin/official-exams/{officialExam}', [AdminOfficialExamController::class, 'show'])->whereUuid('officialExam');
            Route::put('admin/official-exams/{officialExam}', [AdminOfficialExamController::class, 'update'])->whereUuid('officialExam');
            Route::put('admin/official-exams/{officialExam}/questions/{question}', [AdminOfficialExamController::class, 'updateQuestion'])->whereUuid(['officialExam', 'question']);
            Route::post('admin/official-exams/{officialExam}/publish', [AdminOfficialExamController::class, 'publish'])->whereUuid('officialExam');
            Route::get('official-exams', [OfficialExamController::class, 'index']);
            Route::get('official-exams/{officialExam}', [OfficialExamController::class, 'show'])->whereUuid('officialExam');
            Route::get('questions', [QuestionController::class, 'index']);
            Route::get('questions/{question}', [QuestionController::class, 'show'])->whereUuid('question');
            Route::get('contexts/{context}/practice-attempts', [PracticeAttemptController::class, 'index'])->whereUuid('context');
            Route::post('contexts/{context}/practice-attempts', [PracticeAttemptController::class, 'store'])->whereUuid('context');
            Route::get('contexts/{context}/practice-attempts/{attempt}', [PracticeAttemptController::class, 'show'])->whereUuid(['context', 'attempt']);
            Route::post('contexts/{context}/practice-attempts/{attempt}/answer', [PracticeAttemptController::class, 'answer'])->whereUuid(['context', 'attempt']);
            Route::get('contexts/{context}/exam-attempts', [ExamAttemptController::class, 'index'])->whereUuid('context');
            Route::post('contexts/{context}/exam-attempts', [ExamAttemptController::class, 'store'])->whereUuid('context');
            Route::get('contexts/{context}/exam-attempts/{exam}', [ExamAttemptController::class, 'show'])->whereUuid(['context', 'exam']);
            Route::put('contexts/{context}/exam-attempts/{exam}/answers/{answer}', [ExamAttemptController::class, 'answer'])->whereUuid(['context', 'exam', 'answer']);
            Route::post('contexts/{context}/exam-attempts/{exam}/answers/{answer}/report', [ExamAttemptController::class, 'report'])->whereUuid(['context', 'exam', 'answer'])->middleware('throttle:reports');
            Route::post('contexts/{context}/exam-attempts/{exam}/finish', [ExamAttemptController::class, 'finish'])->whereUuid(['context', 'exam']);
            Route::get('contexts/{context}/review-questions', [ReviewController::class, 'index'])->whereUuid('context');
            Route::get('contexts/{context}/review-summary', [ReviewController::class, 'summary'])->whereUuid('context');
            Route::put('contexts/{context}/favorites/{question}', [ReviewController::class, 'favorite'])->whereUuid(['context', 'question']);
            Route::delete('contexts/{context}/favorites/{question}', [ReviewController::class, 'unfavorite'])->whereUuid(['context', 'question']);
            Route::get('contexts/{context}/stats', [StatsController::class, 'show'])->whereUuid('context');
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
