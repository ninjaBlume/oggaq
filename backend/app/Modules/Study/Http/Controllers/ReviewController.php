<?php

namespace App\Modules\Study\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\QuestionBank\Http\Resources\QuestionResource;
use App\Modules\Study\Actions\ListReviewQuestions;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Modules\Study\Actions\SetFavoriteQuestion;
use App\Modules\Study\Http\Requests\ReviewQuestionsRequest;
use App\Modules\Study\ReviewQuestionSet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReviewController extends Controller
{
    public function index(ReviewQuestionsRequest $request, string $context, ListReviewQuestions $action): AnonymousResourceCollection
    {
        return QuestionResource::collection($action->execute($request->user(), $context, $request->validated('kind'), $request->integer('per_page', 20)));
    }

    // How many questions each review list holds right now, so a client can offer "exam from my mistakes" without paging.
    public function summary(Request $request, string $context, ResolveStudyContext $contexts): JsonResponse
    {
        $resolved = $contexts->execute($request->user(), $context);

        return response()->json(['data' => collect(ReviewQuestionSet::KINDS)->mapWithKeys(fn ($kind) => [$kind => ReviewQuestionSet::query($resolved->id, $kind)->count()])->all()]);
    }

    public function favorite(Request $request, string $context, string $question, SetFavoriteQuestion $action): JsonResponse
    {
        $action->execute($request->user(), $context, $question, true);

        return response()->json(['data' => ['question_id' => $question, 'favorite' => true]]);
    }

    public function unfavorite(Request $request, string $context, string $question, SetFavoriteQuestion $action): JsonResponse
    {
        $action->execute($request->user(), $context, $question, false);

        return response()->json(['data' => ['question_id' => $question, 'favorite' => false]]);
    }
}
