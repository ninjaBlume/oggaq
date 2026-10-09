<?php

namespace App\Modules\Exams\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Modules\Exams\Actions\AccessExam;
use App\Modules\Exams\Actions\ListExams;
use App\Modules\Exams\Actions\StartExam;
use App\Modules\Exams\Http\Requests\FinishExamRequest;
use App\Modules\Exams\Http\Requests\SaveExamAnswerRequest;
use App\Modules\Exams\Http\Requests\StartExamRequest;
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

    public function answer(SaveExamAnswerRequest $request, string $context, string $exam, string $answer, AccessExam $action): ExamAttemptResource
    {
        return new ExamAttemptResource($action->execute($request->user(), $context, $exam, $request->validated() + ['answer_id' => $answer]));
    }

    public function finish(FinishExamRequest $request, string $context, string $exam, AccessExam $action): ExamAttemptResource
    {
        return new ExamAttemptResource($action->execute($request->user(), $context, $exam, finishRevision: $request->integer('base_version')));
    }
}
