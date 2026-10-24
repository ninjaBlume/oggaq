<?php

namespace App\Modules\Scoring\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Modules\Scoring\Actions\CalculateScore;
use App\Modules\Scoring\Actions\ScoreExam;
use App\Modules\Scoring\Http\Requests\ScoreExamRequest;
use App\Modules\Scoring\Http\Requests\ScoreInputRequest;
use App\Modules\Scoring\Http\Resources\ScoreResultResource;
use App\Modules\Scoring\Http\Resources\ScoringPeriodResource;
use App\Modules\Scoring\Models\ExamScoreResult;
use App\Modules\Scoring\Models\ScoringPeriod;
use Illuminate\Http\Request;

class ScoringController extends Controller
{
    public function periods(Request $r)
    {
        $filter = $r->validate(['education_type' => ['sometimes', 'in:basic,renewal,weapon_difference'], 'weapon_status' => ['sometimes', 'in:armed,unarmed']]);
        $q = ScoringPeriod::with('rule')->orderByDesc('exam_date')->orderBy('education_type')->orderBy('weapon_status');
        foreach ($filter as $k => $v) {
            $q->where($k, $v);
        }

        return ScoringPeriodResource::collection($q->get());
    }

    public function preview(ScoreInputRequest $r, CalculateScore $action)
    {
        return response()->json(['data' => $action->preview($r->string('period_id')->toString(), $r->validated())]);
    }

    public function store(ScoreInputRequest $r, CalculateScore $action)
    {
        $r->validate(['id' => ['required', 'uuid']]);

        return new ScoreResultResource($action->save($r->user(), $r->validated()));
    }

    public function history(PaginationRequest $r)
    {
        return ScoreResultResource::collection(ExamScoreResult::where('user_id', $r->user()->id)->whereNull('exam_attempt_id')->whereNotNull('output')->orderByDesc('created_at')->orderByDesc('id')->cursorPaginate($r->integer('per_page', 10))->withQueryString());
    }

    public function exam(ScoreExamRequest $r, string $context, string $exam, ScoreExam $action)
    {
        return new ScoreResultResource($action->append($r->user(), $context, $exam, $r->validated()));
    }
}
