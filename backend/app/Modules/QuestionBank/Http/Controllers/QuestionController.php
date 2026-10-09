<?php

namespace App\Modules\QuestionBank\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\QuestionBank\Http\Requests\QuestionListRequest;
use App\Modules\QuestionBank\Http\Resources\QuestionResource;
use App\Modules\QuestionBank\Models\Question;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QuestionController extends Controller
{
    public function index(QuestionListRequest $request): AnonymousResourceCollection
    {
        $query = Question::with('publishedVersion.options', 'publishedVersion.source')->whereNotNull('published_version_id');
        foreach (['subject_id', 'topic_id', 'exam_type_id', 'source_id'] as $filter) {
            if ($request->has($filter)) {
                $query->whereHas('publishedVersion', fn ($version) => $version->where($filter, $request->validated($filter)));
            }
        }

        return QuestionResource::collection($query->orderBy('id')->cursorPaginate($request->integer('per_page', 20))->withQueryString());
    }

    public function show(string $question): QuestionResource
    {
        $record = Question::with('publishedVersion.options', 'publishedVersion.source')->whereNotNull('published_version_id')->findOrFail($question);

        return new QuestionResource($record);
    }
}
