<?php

namespace App\Modules\QuestionBank\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Actions\UpdateOfficialExamQuestion;
use App\Modules\QuestionBank\Http\Requests\OfficialExamListRequest;
use App\Modules\QuestionBank\Http\Requests\SaveOfficialExamRequest;
use App\Modules\QuestionBank\Http\Requests\UpdateOfficialExamQuestionRequest;
use App\Modules\QuestionBank\Http\Resources\AdminOfficialExamResource;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\OfficialExamHealth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AdminOfficialExamController extends Controller
{
    public function index(OfficialExamListRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('manage', Question::class);
        $query = OfficialExam::with('source', 'examType', 'subject')->withCount('questions');
        foreach (['exam_type_id', 'year', 'term', 'weapon_status', 'subject_id'] as $filter) {
            if ($request->has($filter)) {
                $query->where($filter, $request->validated($filter));
            }
        }
        if ($request->has('status')) {
            $request->validated('status') === 'draft' ? $query->whereNull('published_at') : $query->whereNotNull('published_at');
        }

        $page = $query->orderByDesc('year')->orderBy('id')->cursorPaginate($request->integer('per_page', 20))->withQueryString();
        OfficialExamHealth::attach($page->getCollection());

        return AdminOfficialExamResource::collection($page);
    }

    public function store(SaveOfficialExamRequest $request, SaveOfficialExam $action): JsonResponse
    {
        $exam = $action->execute($request->user(), $request->validated());

        return (new AdminOfficialExamResource($this->detailed($exam)))->response()->setStatusCode(201);
    }

    public function show(Request $request, OfficialExam $officialExam): AdminOfficialExamResource
    {
        Gate::authorize('manage', Question::class);

        return new AdminOfficialExamResource($this->detailed($officialExam->loadCount('questions')->load('source', 'examType', 'subject')));
    }

    public function update(SaveOfficialExamRequest $request, OfficialExam $officialExam, SaveOfficialExam $action): AdminOfficialExamResource
    {
        return new AdminOfficialExamResource($this->detailed($action->execute($request->user(), $request->validated(), $officialExam)));
    }

    public function updateQuestion(UpdateOfficialExamQuestionRequest $request, OfficialExam $officialExam, string $question, UpdateOfficialExamQuestion $action): AdminOfficialExamResource
    {
        $exam = $action->execute($request->user(), $officialExam, $question, $request->validated('question_version_id'));

        return new AdminOfficialExamResource($this->detailed($exam->loadCount('questions')->load('source')));
    }

    public function publish(Request $request, OfficialExam $officialExam, PublishOfficialExam $action): AdminOfficialExamResource
    {
        Gate::authorize('manage', Question::class);

        return new AdminOfficialExamResource($this->detailed($action->execute($request->user(), $officialExam)));
    }

    private function detailed(OfficialExam $exam): OfficialExam
    {
        OfficialExamHealth::attach([$exam]);

        return $exam->load('examType', 'subject', 'questions.questionVersion.options', 'questions.questionVersion.source', 'questions.questionVersion.question.latestVersion.options', 'questions.questionVersion.question.latestVersion.source');
    }
}
