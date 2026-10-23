<?php

namespace App\Modules\QuestionBank\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\QuestionBank\Actions\ResolveQuestionReports;
use App\Modules\QuestionBank\Http\Requests\QuestionReportListRequest;
use App\Modules\QuestionBank\Http\Requests\ResolveQuestionReportsRequest;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\QuestionReportQueue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

// Platform administrators only; the reporter's identity is never part of any response.
class AdminQuestionReportController extends Controller
{
    public function index(QuestionReportListRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('manage', Question::class);

        return JsonResource::collection(QuestionReportQueue::page($request->validated('status', 'open'), $request->integer('per_page', 20)));
    }

    public function summary(): JsonResponse
    {
        Gate::authorize('manage', Question::class);

        return response()->json(['data' => QuestionReportQueue::summary()]);
    }

    public function resolve(ResolveQuestionReportsRequest $request, string $question, ResolveQuestionReports $action): JsonResponse
    {
        $closed = $action->execute($request->user(), $question, $request->validated('status'), $request->validated('resolution_note'));

        return response()->json(['data' => ['question_id' => $question, 'status' => $request->validated('status'), 'closed_reports' => $closed]]);
    }
}
