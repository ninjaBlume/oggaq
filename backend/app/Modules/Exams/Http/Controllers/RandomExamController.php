<?php

namespace App\Modules\Exams\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Exams\Actions\StartRandomExam;
use App\Modules\Exams\Http\Requests\StartRandomExamRequest;
use App\Modules\Exams\Http\Resources\ExamAttemptResource;
use App\Modules\Exams\Http\Resources\ExamSummaryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RandomExamController extends Controller
{
    public function current(Request $request, string $context, StartRandomExam $action): JsonResponse
    {
        $exam = $action->current($request->user(), $context);

        return response()->json(['data' => $exam === null ? null : (new ExamSummaryResource($exam))->resolve($request)]);
    }

    public function store(StartRandomExamRequest $request, string $context, StartRandomExam $action): JsonResponse
    {
        return (new ExamAttemptResource($action->execute($request->user(), $context, $request->validated())))->response()->setStatusCode(200);
    }
}
