<?php

namespace App\Modules\Exams\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Exams\Actions\ImportOfflineExam;
use App\Modules\Exams\Actions\PrepareOfflineExam;
use App\Modules\Exams\Http\Requests\ImportOfflineExamRequest;
use App\Modules\Exams\Http\Resources\ExamAttemptResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfflineExamController extends Controller
{
    public function show(Request $request, string $context, string $exam, PrepareOfflineExam $action): JsonResponse
    {
        return response()->json($action->execute($request->user(), $context, $exam, $request))->header('Cache-Control', 'private, no-store');
    }

    public function import(ImportOfflineExamRequest $request, string $context, ImportOfflineExam $action): JsonResponse
    {
        return (new ExamAttemptResource($action->execute($request->user(), $context, $request->validated(), $request->input('claim'))))->response()->setStatusCode(200);
    }
}
