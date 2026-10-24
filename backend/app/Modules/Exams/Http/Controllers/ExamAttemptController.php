<?php

namespace App\Modules\Exams\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Modules\Exams\Actions\AccessExam;
use App\Modules\Exams\Actions\ListExams;
use App\Modules\Exams\Actions\ReportExamQuestion;
use App\Modules\Exams\Actions\SaveExamPosition;
use App\Modules\Exams\Actions\StartExam;
use App\Modules\Exams\Http\Requests\FinishExamRequest;
use App\Modules\Exams\Http\Requests\ReportQuestionRequest;
use App\Modules\Exams\Http\Requests\SaveExamAnswerRequest;
use App\Modules\Exams\Http\Requests\SaveExamPositionRequest;
use App\Modules\Exams\Http\Requests\StartExamRequest;
use App\Modules\Exams\Http\Resources\ExamAnswerStateResource;
use App\Modules\Exams\Http\Resources\ExamAttemptResource;
use App\Modules\Exams\Http\Resources\ExamSummaryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ExamAttemptController extends Controller
{
    public function index(PaginationRequest $request, string $context, ListExams $action): AnonymousResourceCollection
    {
        return ExamSummaryResource::collection($action->execute($request->user(), $context, $request->integer('per_page', 20)));
    }

    public function store(StartExamRequest $request, string $context, StartExam $action): JsonResponse
    {
        return (new ExamAttemptResource($action->execute($request->user(), $context, $request->validated())))->response()->setStatusCode(200);
    }

    public function show(Request $request, string $context, string $exam, AccessExam $action): ExamAttemptResource
    {
        return new ExamAttemptResource($action->execute($request->user(), $context, $exam));
    }

    public function answer(SaveExamAnswerRequest $request, string $context, string $exam, string $answer, AccessExam $action): ExamAttemptResource|ExamAnswerStateResource
    {
        $attempt = $action->execute($request->user(), $context, $exam, $request->validated() + ['answer_id' => $answer], compact: $request->boolean('compact'));

        return $request->boolean('compact') ? new ExamAnswerStateResource($attempt) : new ExamAttemptResource($attempt);
    }

    public function position(SaveExamPositionRequest $request, string $context, string $exam, SaveExamPosition $action): ExamSummaryResource
    {
        return new ExamSummaryResource($action->execute($request->user(), $context, $exam, $request->integer('position')));
    }

    public function finish(FinishExamRequest $request, string $context, string $exam, AccessExam $action): ExamAttemptResource
    {
        return new ExamAttemptResource($action->execute($request->user(), $context, $exam, finishRevision: $request->integer('base_version')));
    }

    // 201 when the report is new, 200 with the same report when the student had already reported this question.
    public function report(ReportQuestionRequest $request, string $context, string $exam, string $answer, ReportExamQuestion $action): JsonResponse
    {
        [$report, $created] = $action->execute($request->user(), $context, $exam, $answer, $request->validated());

        return response()->json(['data' => ['id' => $report->id, 'question_id' => $report->question_id, 'reason' => $report->reason, 'status' => $report->status, 'created_at' => $report->created_at->toISOString()]], $created ? 201 : 200);
    }
}
