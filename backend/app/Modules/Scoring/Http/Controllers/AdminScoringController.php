<?php

namespace App\Modules\Scoring\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\Scoring\Actions\ManageScoring;
use App\Modules\Scoring\Http\Requests\SaveScoringRuleRequest;
use App\Modules\Scoring\Http\Resources\ScoringPeriodResource;
use App\Modules\Scoring\Http\Resources\ScoringRuleResource;
use App\Modules\Scoring\Models\ScoringRule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class AdminScoringController extends Controller
{
    public function index(Request $r)
    {
        Gate::authorize('manage', Question::class);

        return ScoringRuleResource::collection(ScoringRule::orderByDesc('created_at')->get());
    }

    public function store(SaveScoringRuleRequest $r, ManageScoring $a)
    {
        return new ScoringRuleResource($a->save($r->user(), $r->validated()));
    }

    public function update(SaveScoringRuleRequest $r, string $rule, ManageScoring $a)
    {
        return new ScoringRuleResource($a->save($r->user(), $r->validated(), $rule));
    }

    public function publish(Request $r, string $rule, ManageScoring $a)
    {
        Gate::authorize('manage', Question::class);
        $r->validate(['source_verified' => ['required', 'accepted']]);

        return new ScoringRuleResource($a->publish($r->user(), $rule));
    }

    public function archive(Request $r, string $rule, ManageScoring $a)
    {
        Gate::authorize('manage', Question::class);

        return new ScoringRuleResource($a->archive($r->user(), $rule));
    }

    public function period(Request $r, ManageScoring $a)
    {
        Gate::authorize('manage', Question::class);
        $input = $r->validate(['scoring_rule_id' => ['required', 'uuid', 'exists:scoring_rules,id'], 'number' => ['required', 'integer', 'between:1,10000'], 'exam_date' => ['required', 'date_format:Y-m-d'], 'source_url' => ['required', 'url:http,https', 'max:2000', function ($attribute, $value, $fail) {
            if (! preg_match('/\.(gov|pol)\.tr$/i', parse_url($value, PHP_URL_HOST) ?? '')) {
                $fail('Resmî kurum kaynağı gerekli.');
            }
        }]]);

        return new ScoringPeriodResource($a->period($r->user(), $input));
    }

    public function updatePeriod(Request $r, string $period, ManageScoring $a)
    {
        Gate::authorize('manage', Question::class);
        $input = $r->validate(['scoring_rule_id' => ['required', 'uuid', 'exists:scoring_rules,id'], 'number' => ['required', 'integer', 'between:1,10000'], 'exam_date' => ['required', 'date_format:Y-m-d'], 'source_url' => ['required', 'url:http,https', 'max:2000', function ($attribute, $value, $fail) {
            if (! preg_match('/\.(gov|pol)\.tr$/i', parse_url($value, PHP_URL_HOST) ?? '')) {
                $fail('Resmî kurum kaynağı gerekli.');
            }
        }]]);

        return new ScoringPeriodResource($a->period($r->user(), $input, $period));
    }

    public function link(Request $r, string $officialExam, ManageScoring $a)
    {
        Gate::authorize('manage', Question::class);
        $input = $r->validate(['scoring_period_id' => ['required', 'uuid', 'exists:scoring_periods,id']]);
        DB::transaction(fn () => $a->link($r->user(), OfficialExam::whereKey($officialExam)->lockForUpdate()->firstOrFail(), $input['scoring_period_id']));

        return response()->json(['data' => ['official_exam_id' => $officialExam, 'scoring_period_id' => $input['scoring_period_id']]]);
    }
}
