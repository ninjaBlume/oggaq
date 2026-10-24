<?php

namespace App\Modules\QuestionBank\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\QuestionBank\Http\Requests\OfficialExamListRequest;
use App\Modules\QuestionBank\Http\Resources\OfficialExamResource;
use App\Modules\QuestionBank\Models\OfficialExam;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OfficialExamController extends Controller
{
    public function index(OfficialExamListRequest $request): AnonymousResourceCollection
    {
        $query = OfficialExam::with('source', 'examType', 'subject')->withCount('questions')->whereNotNull('published_at');
        if ($request->has('scope')) {
            $request->validated('scope') === 'whole' ? $query->whereNull('subject_id') : $query->whereNotNull('subject_id');
        }
        foreach (['exam_type_id', 'year', 'term', 'weapon_status', 'subject_id'] as $filter) {
            if ($request->has($filter)) {
                $query->where($filter, $request->validated($filter));
            }
        }

        return OfficialExamResource::collection($query->orderByDesc('year')->orderBy('id')->cursorPaginate($request->integer('per_page', 20))->withQueryString());
    }

    public function show(string $officialExam): OfficialExamResource
    {
        return new OfficialExamResource(OfficialExam::with('source', 'examType', 'subject')->withCount('questions')->whereNotNull('published_at')->findOrFail($officialExam));
    }
}
