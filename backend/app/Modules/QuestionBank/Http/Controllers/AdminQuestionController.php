<?php

namespace App\Modules\QuestionBank\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Modules\QuestionBank\Actions\ApplyQuestionVersionToExams;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Http\Requests\ApplyQuestionToExamsRequest;
use App\Modules\QuestionBank\Http\Requests\PublishQuestionRequest;
use App\Modules\QuestionBank\Http\Requests\QuestionListRequest;
use App\Modules\QuestionBank\Http\Requests\SaveQuestionRequest;
use App\Modules\QuestionBank\Http\Resources\AdminQuestionResource;
use App\Modules\QuestionBank\Http\Resources\AdminQuestionVersionResource;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\QuestionExamMemberships;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class AdminQuestionController extends Controller
{
    public function index(QuestionListRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('manage', Question::class);
        $query = Question::with('latestVersion.options', 'latestVersion.source');
        foreach (['subject_id', 'topic_id', 'exam_type_id', 'source_id'] as $filter) {
            if ($filter === 'topic_id' && $request->validated('topic_id') === 'none') {
                $query->whereHas('latestVersion', fn ($version) => $version->whereNull('topic_id'));
            } elseif ($request->has($filter)) {
                $query->whereHas('latestVersion', fn ($version) => $version->where($filter, $request->validated($filter)));
            }
        }
        if ($request->has('official_exam_id')) {
            $inExams = DB::table('official_exam_questions')->select('question_id');
            $request->validated('official_exam_id') === 'none'
                ? $query->whereNotIn('id', $inExams)
                : $query->whereIn('id', $inExams->where('official_exam_id', $request->validated('official_exam_id')));
        }
        if ($request->has('status')) {
            $request->validated('status') === 'draft' ? $query->whereNull('published_version_id') : $query->whereNotNull('published_version_id');
        }

        $page = $query->orderBy('id')->cursorPaginate($request->integer('per_page', 20))->withQueryString();
        QuestionExamMemberships::attach($page->getCollection(), publishedOnly: false);

        return AdminQuestionResource::collection($page);
    }

    // Counts per subject and topic (latest version), so editors can track progress without paging through questions.
    public function stats(): JsonResponse
    {
        Gate::authorize('manage', Question::class);
        $rows = DB::table('questions as q')->join('question_versions as v', 'v.id', '=', 'q.latest_version_id')->groupBy('v.subject_id', 'v.topic_id')
            ->selectRaw('v.subject_id, v.topic_id, count(*) as total, count(*) filter (where q.published_version_id is not null) as published, count(*) filter (where q.published_version_id is null) as draft, count(*) filter (where q.published_version_id is not null and q.published_version_id <> q.latest_version_id) as pending')
            ->get()->map(fn ($row) => ['subject_id' => $row->subject_id, 'topic_id' => $row->topic_id, 'total' => (int) $row->total, 'published' => (int) $row->published, 'draft' => (int) $row->draft, 'pending' => (int) $row->pending])->all();

        return response()->json(['data' => $rows]);
    }

    // The exams that use a subject's questions, with how many of the subject's questions each contains (exam based view of a subject).
    public function subjectExamStats(string $subject): JsonResponse
    {
        Gate::authorize('manage', Question::class);
        $inSubject = fn () => DB::table('questions as q')->join('question_versions as v', 'v.id', '=', 'q.latest_version_id')->where('v.subject_id', $subject);
        $exams = $inSubject()->join('official_exam_questions as eq', 'eq.question_id', '=', 'q.id')->join('official_exams as e', 'e.id', '=', 'eq.official_exam_id')->join('exam_types as t', 't.id', '=', 'e.exam_type_id')
            ->groupBy('e.id', 't.name')->orderByDesc('e.year')->orderBy('e.id')
            ->selectRaw('e.id as official_exam_id, e.exam_type_id, t.name as exam_type_name, e.exam_number, e.year, e.term, e.weapon_status, e.title, (e.published_at is not null) as published, count(*) as total, count(*) filter (where q.published_version_id is null) as draft')
            ->get()->map(fn ($row) => ['official_exam_id' => $row->official_exam_id, 'exam_type_id' => $row->exam_type_id, 'exam_type_name' => $row->exam_type_name, 'exam_number' => $row->exam_number, 'year' => (int) $row->year, 'term' => $row->term, 'weapon_status' => $row->weapon_status, 'title' => $row->title, 'status' => $row->published ? 'published' : 'draft', 'total' => (int) $row->total, 'draft' => (int) $row->draft])->all();
        $without = $inSubject()->whereNotIn('q.id', DB::table('official_exam_questions')->select('question_id'))->count();

        return response()->json(['data' => $exams, 'without_exam' => $without]);
    }

    public function applyToExams(ApplyQuestionToExamsRequest $request, Question $question, ApplyQuestionVersionToExams $action): JsonResponse
    {
        return response()->json(['data' => $action->execute($request->user(), $question, $request->validated('question_version_id'))]);
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
