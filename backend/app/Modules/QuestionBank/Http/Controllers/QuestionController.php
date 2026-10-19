<?php

namespace App\Modules\QuestionBank\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\QuestionBank\Http\Requests\QuestionListRequest;
use App\Modules\QuestionBank\Http\Resources\QuestionResource;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\QuestionExamMemberships;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

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

        if ($request->has('official_exam_id')) {
            // Only published exams are visible to students; a draft exam id simply matches nothing.
            $query->whereIn('id', DB::table('official_exam_questions as q')->join('official_exams as e', 'e.id', '=', 'q.official_exam_id')
                ->whereNotNull('e.published_at')->where('q.official_exam_id', $request->validated('official_exam_id'))->select('q.question_id'));
        }
        $page = $query->orderBy('id')->cursorPaginate($request->integer('per_page', 20))->withQueryString();
        QuestionExamMemberships::attach($page->getCollection());

        return QuestionResource::collection($page);
    }

    public function show(string $question): QuestionResource
    {
        $record = Question::with('publishedVersion.options', 'publishedVersion.source')->whereNotNull('published_version_id')->findOrFail($question);

        return new QuestionResource($record);
    }
}
