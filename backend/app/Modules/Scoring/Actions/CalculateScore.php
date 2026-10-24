<?php

namespace App\Modules\Scoring\Actions;

use App\Models\User;
use App\Modules\Scoring\ExamScoringService;
use App\Modules\Scoring\Models\ExamScoreResult;
use App\Modules\Scoring\Models\ScoringPeriod;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

class CalculateScore
{
    public function preview(string $periodId, array $input): array
    {
        $p = ScoringPeriod::with('rule')->findOrFail($periodId);

        if (isset($input['expected_rule_id']) && $input['expected_rule_id'] !== $p->scoring_rule_id) {
            throw new ApiProblem(409, 'scoring_rule_changed', 'Dönemin kuralı güncellendi. Dönemleri yenileyerek tekrar hesaplayın.');
        }

        return app(ExamScoringService::class)->calculate($p->rule, $input);
    }

    public function save(User $actor, array $input): ExamScoreResult
    {
        return DB::transaction(function () use ($actor, $input) {
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            if ($actor->status !== 'active' || ! $actor->hasVerifiedEmail()) {
                throw new ApiProblem(403, 'forbidden', 'Puan hesabı için doğrulanmış aktif hesap gerekli.');
            }
            $period = ScoringPeriod::with('rule')->whereKey($input['period_id'])->sharedLock()->firstOrFail();
            $existing = ExamScoreResult::where('id', $input['id'])->orWhere('operation_id', $input['id'])->with('rule')->first();
            if (! $existing && isset($input['expected_rule_id']) && $input['expected_rule_id'] !== $period->scoring_rule_id) {
                throw new ApiProblem(409, 'scoring_rule_changed', 'Dönemin kuralı güncellendi. Dönemleri yenileyerek tekrar hesaplayın.');
            }
            $normalized = app(ExamScoringService::class)->validateInputs($existing?->rule->configuration ?? $period->rule->configuration, $input);
            if ($existing) {
                if ($existing->user_id !== $actor->id || $existing->exam_attempt_id !== null || $existing->scoring_period_id !== $period->id || $existing->input != $normalized) {
                    throw new ApiProblem(409, 'idempotency_conflict', 'Bu işlem kimliği başka bir hesaplama için kullanılmış.');
                }

                return $existing->load('rule', 'period');
            }
            $result = app(ExamScoringService::class)->calculate($period->rule, $normalized);

            return ExamScoreResult::create(['id' => $input['id'], 'user_id' => $actor->id, 'scoring_rule_id' => $period->scoring_rule_id, 'scoring_period_id' => $period->id, 'revision' => 1, 'input' => $normalized, 'output' => $result, 'created_at' => now()])->load('rule', 'period');
        });
    }
}
