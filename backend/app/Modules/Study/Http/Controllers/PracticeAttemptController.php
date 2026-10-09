<?php

namespace App\Modules\Study\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Modules\Study\Actions\AnswerPracticeAttempt;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Modules\Study\Actions\StartPracticeAttempt;
use App\Modules\Study\Http\Requests\AnswerPracticeRequest;
use App\Modules\Study\Http\Requests\StartPracticeRequest;
use App\Modules\Study\Http\Resources\PracticeAttemptResource;
use App\Modules\Study\Models\PracticeAttempt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PracticeAttemptController extends Controller
{
    public function index(PaginationRequest $request, string $context, ResolveStudyContext $contexts): AnonymousResourceCollection
    {
        $context = $contexts->execute($request->user(), $context);
        $attempts = PracticeAttempt::where('study_context_id', $context->id)->with(['questionVersion.options', 'questionVersion.source'])
            ->orderByDesc('created_at')->orderByDesc('id')->cursorPaginate($request->integer('per_page', 20))->withQueryString();

        return PracticeAttemptResource::collection($attempts);
    }

    public function store(StartPracticeRequest $request, string $context, StartPracticeAttempt $action): JsonResponse
    {
        return (new PracticeAttemptResource($action->execute($request->user(), $context, $request->validated())))->response()->setStatusCode(200);
    }

    public function show(Request $request, string $context, string $attempt, ResolveStudyContext $contexts): PracticeAttemptResource
    {
        $context = $contexts->execute($request->user(), $context);
        $attempt = PracticeAttempt::where('study_context_id', $context->id)->with(['questionVersion.options', 'questionVersion.source'])->findOrFail($attempt);

        return new PracticeAttemptResource($attempt);
    }

    public function answer(AnswerPracticeRequest $request, string $context, string $attempt, AnswerPracticeAttempt $action): PracticeAttemptResource
    {
        return new PracticeAttemptResource($action->execute($request->user(), $context, $attempt, $request->validated('selected_option_id')));
    }
}
