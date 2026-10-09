<?php

namespace App\Modules\QuestionBank\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Http\Requests\PublishQuestionRequest;
use App\Modules\QuestionBank\Http\Requests\QuestionListRequest;
use App\Modules\QuestionBank\Http\Requests\SaveQuestionRequest;
use App\Modules\QuestionBank\Http\Resources\AdminQuestionResource;
use App\Modules\QuestionBank\Http\Resources\AdminQuestionVersionResource;
use App\Modules\QuestionBank\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AdminQuestionController extends Controller
{
    public function index(QuestionListRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('manage', Question::class);
        $query = Question::with('latestVersion.options', 'latestVersion.source');
        foreach (['subject_id', 'topic_id', 'exam_type_id', 'source_id'] as $filter) {
            if ($request->has($filter)) {
                $query->whereHas('latestVersion', fn ($version) => $version->where($filter, $request->validated($filter)));
            }
        }
        if ($request->has('status')) {
            $request->validated('status') === 'draft' ? $query->whereNull('published_version_id') : $query->whereNotNull('published_version_id');
        }

        return AdminQuestionResource::collection($query->orderBy('id')->cursorPaginate($request->integer('per_page', 20))->withQueryString());
    }

    public function store(SaveQuestionRequest $request, SaveQuestion $action): JsonResponse
    {
        return (new AdminQuestionResource($action->execute($request->user(), $request->validated())))
            ->response()->setStatusCode(201);
    }

    public function show(Question $question): AdminQuestionResource
    {
        Gate::authorize('manage', Question::class);

        return new AdminQuestionResource($question->load('latestVersion.options', 'latestVersion.source'));
    }

    public function update(SaveQuestionRequest $request, Question $question, SaveQuestion $action): AdminQuestionResource
    {
        return new AdminQuestionResource($action->execute($request->user(), $request->validated(), $question));
    }

    public function publish(PublishQuestionRequest $request, Question $question, PublishQuestion $action): AdminQuestionResource
    {
        return new AdminQuestionResource($action->execute($request->user(), $question, $request->integer('base_version')));
    }

    public function versions(PaginationRequest $request, Question $question): AnonymousResourceCollection
    {
        Gate::authorize('manage', Question::class);

        return AdminQuestionVersionResource::collection($question->versions()->with('options', 'source')
            ->orderByDesc('version')->cursorPaginate($request->integer('per_page', 20)));
    }
}
