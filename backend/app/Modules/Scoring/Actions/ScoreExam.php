<?php

namespace App\Modules\Scoring\Actions;

use App\Models\User;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\Scoring\ExamScoringService;
use App\Modules\Scoring\Models\ExamScoreResult;
use App\Modules\Scoring\Models\ScoringPeriod;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

class ScoreExam
{
    // Called in StartExam's transaction. The pinned rule is never replaced on an existing attempt.
    public function pin(ExamAttempt $exam, string $userId): ?ExamScoreResult
    {
        if (! $exam->official_exam_id) {
            return null;
        }
        $periodId = DB::table('official_exam_scoring')->where('official_exam_id', $exam->official_exam_id)->value('scoring_period_id');
        if (! $periodId) {
            return null;
        }
        $p = ScoringPeriod::with('rule')->whereKey($periodId)->sharedLock()->firstOrFail();
        $c = $p->rule->configuration;
        if ($exam->question_count !== $c['general_count'] + $c['weapon_count']) {
            return null;
        }

        return ExamScoreResult::firstOrCreate(['exam_attempt_id' => $exam->id, 'revision' => 1], ['user_id' => $userId, 'scoring_rule_id' => $p->scoring_rule_id, 'scoring_period_id' => $p->id, 'created_at' => now()]);
    }

    public function finalize(ExamAttempt $exam): void
    {
        $snapshot = ExamScoreResult::where('exam_attempt_id', $exam->id)->where('revision', 1)->with('rule')->first();
        if (! $snapshot || $snapshot->output !== null) {
            return;
        }
        $input = $this->answers($exam, $snapshot->rule->configuration);
        $snapshot->input = app(ExamScoringService::class)->validateInputs($snapshot->rule->configuration, $input);
        $snapshot->output = app(ExamScoringService::class)->calculate($snapshot->rule, $snapshot->input);
        $snapshot->save();
        $exam->unsetRelation('scoreResult');
    }

    public function append(User $actor, string $contextId, string $examId, array $input): ExamScoreResult
    {
        return DB::transaction(function () use ($actor, $contextId, $examId, $input) {
            $context = app(ResolveStudyContext::class)->execute($actor, $contextId, true);
            $exam = ExamAttempt::where('study_context_id', $context->id)->whereKey($examId)->lockForUpdate()->firstOrFail();
            if (! $exam->finished_at) {
                throw new ApiProblem(409, 'exam_not_finished', 'Puan hesabı için önce denemeyi tamamlayın.');
            }
            $base = ExamScoreResult::where('exam_attempt_id', $exam->id)->with('rule')->orderByDesc('revision')->first() ?? $this->pin($exam, $actor->id)?->load('rule');
            if (! $base) {
                throw new ApiProblem(409, 'scoring_unavailable', 'Bu sınav için doğrulanmış bir puanlama dönemi bağlı değil.');
            }
            $counts = $this->answers($exam, $base->rule->configuration) + ['shooting_hits' => $input['shooting_hits'] ?? null, 'previous_general_score' => $input['previous_general_score'] ?? null];
            $counts = app(ExamScoringService::class)->validateInputs($base->rule->configuration, $counts);
            $previous = ExamScoreResult::where('id', $input['id'])->orWhere('operation_id', $input['id'])->first();
            if ($previous) {
                if ($previous->user_id !== $actor->id || $previous->exam_attempt_id !== $exam->id || $previous->input != $counts) {
                    throw new ApiProblem(409, 'idempotency_conflict', 'Bu işlem kimliği başka puan hesabında kullanılmış.');
                }

                return $previous->load('rule', 'period');
            }
            if ($base->output === null) {
                $base->operation_id = $input['id'];
                $base->input = $counts;
                $base->output = app(ExamScoringService::class)->calculate($base->rule, $counts);
                $base->save();

                return $base->load('rule', 'period');
            }

            return ExamScoreResult::create(['id' => $input['id'], 'user_id' => $actor->id, 'exam_attempt_id' => $exam->id, 'revision' => $base->revision + 1, 'scoring_rule_id' => $base->scoring_rule_id, 'scoring_period_id' => $base->scoring_period_id, 'input' => $counts, 'output' => app(ExamScoringService::class)->calculate($base->rule, $counts), 'created_at' => now()])->load('rule', 'period');
        });
    }

    private function answers(ExamAttempt $exam, array $c): array
    {
        $counts = [];
        foreach (['general' => [1, $c['general_count']], 'weapon' => [$c['general_count'] + 1, $c['general_count'] + $c['weapon_count']]] as $key => [$start,$end]) {
            $row = DB::table('exam_answers')->where('exam_attempt_id', $exam->id)->whereBetween('position', [$start, $end])->selectRaw('count(*) filter(where is_correct=true) as correct, count(*) filter(where selected_option_id is not null and is_correct=false) as wrong')->first();
            $counts[$key.'_correct'] = (int) $row->correct;
            $counts[$key.'_wrong'] = (int) $row->wrong;
        }

        return $counts;
    }
}
