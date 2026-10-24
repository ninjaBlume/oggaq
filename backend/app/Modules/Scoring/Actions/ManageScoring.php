<?php

namespace App\Modules\Scoring\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\Scoring\Models\ScoringPeriod;
use App\Modules\Scoring\Models\ScoringRule;
use App\Modules\Scoring\RuleConfiguration;
use App\Support\ApiProblem;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManageScoring
{
    public function save(User $actor, array $input, ?string $id = null): ScoringRule
    {
        return DB::transaction(function () use ($actor, $input, $id) {
            $this->authorize($actor);
            app(RuleConfiguration::class)->validate($input);
            DB::select('select pg_advisory_xact_lock(hashtext(?))', ['scoring_code:'.$input['code']]);
            $rule = $id === null ? new ScoringRule : ScoringRule::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($rule->published_at !== null) {
                throw new ApiProblem(409, 'immutable_scoring_rule', 'Yayımlanmış kural için yeni sürüm oluşturun.');
            }
            if ($id !== null && $rule->code !== $input['code']) {
                throw ValidationException::withMessages(['code' => ['Kural kodu sürüm ailesini belirler; kod değiştirmek için yeni kural oluşturun.']]);
            }
            $rule->fill($input);
            if ($id === null) {
                $rule->version = (ScoringRule::where('code', $input['code'])->max('version') ?? 0) + 1;
                $rule->created_at = now();
                $rule->created_by = $actor->id;
            }
            $rule->save();
            $this->audit($actor, $rule->id, $id === null ? 'scoring_rule.created' : 'scoring_rule.revised');

            return $rule;
        });
    }

    public function publish(User $actor, string $id): ScoringRule
    {
        try {
            return DB::transaction(function () use ($actor, $id) {
                $this->authorize($actor);
                $rule = ScoringRule::whereKey($id)->lockForUpdate()->firstOrFail();
                if ($rule->published_at === null) {
                    app(RuleConfiguration::class)->validate($rule->toArray());
                    $rule->published_at = now();
                    $rule->save();
                    $this->audit($actor, $id, 'scoring_rule.published');
                }

                return $rule;
            });
        } catch (QueryException $e) {
            if ($e->getCode() === '23514' && str_contains($e->getMessage(), 'ranges overlap')) {
                throw ValidationException::withMessages(['effective_from' => ['Aynı eğitim/seçenek için tarih ve dönem aralıkları başka etkin kuralla çakışıyor. Önce eski kuralı arşivleyin.']]);
            }throw $e;
        }
    }

    public function archive(User $actor, string $id): ScoringRule
    {
        return DB::transaction(function () use ($actor, $id) {
            $this->authorize($actor);
            $r = ScoringRule::whereKey($id)->lockForUpdate()->firstOrFail();
            if (! $r->published_at) {
                throw new ApiProblem(409, 'not_published', 'Yalnız yayımlanmış kural arşivlenebilir.');
            }if (! $r->archived_at) {
                $r->archived_at = now();
                $r->save();
                $this->audit($actor, $id, 'scoring_rule.archived');
            }

            return $r;
        });
    }

    public function period(User $actor, array $input, ?string $id = null): ScoringPeriod
    {
        return DB::transaction(function () use ($actor, $input, $id) {
            $this->authorize($actor);
            $rule = ScoringRule::whereKey($input['scoring_rule_id'])->lockForUpdate()->firstOrFail();
            if (! $rule->published_at || $rule->archived_at || $input['number'] < $rule->period_from || $input['number'] > $rule->period_until || $input['exam_date'] < $rule->getRawOriginal('effective_from') || ($rule->effective_until && $input['exam_date'] > $rule->getRawOriginal('effective_until'))) {
                throw ValidationException::withMessages(['scoring_rule_id' => ['Kural etkin, yayımlanmış ve dönemin tarih/numarasına uygun olmalı.']]);
            }
            if ($id === null && ScoringPeriod::where('education_type', $rule->education_type)->where('weapon_status', $rule->weapon_status)->where('number', $input['number'])->exists()) {
                throw new ApiProblem(409, 'duplicate_scoring_period', 'Bu eğitim, seçenek ve dönem için kural zaten tanımlı.');
            }
            if ($id !== null) {
                $p = ScoringPeriod::whereKey($id)->lockForUpdate()->firstOrFail();
                if ($p->education_type !== $rule->education_type || $p->weapon_status !== $rule->weapon_status || $p->number !== $input['number'] || $p->exam_date->toDateString() !== $input['exam_date']) {
                    throw ValidationException::withMessages(['number' => ['Dönemin kimliği ve tarihi değiştirilemez. Yalnız yeni kural sürümü bağlanabilir.']]);
                }
                $incompatibleExam = DB::table('official_exam_scoring as link')
                    ->join('official_exams as exam', 'exam.id', '=', 'link.official_exam_id')
                    ->where('link.scoring_period_id', $p->id)->whereNotNull('exam.published_at')
                    ->whereRaw('(select count(*) from official_exam_questions q where q.official_exam_id = exam.id) <> ?', [$rule->configuration['general_count'] + $rule->configuration['weapon_count']])->exists();
                if ($incompatibleExam) {
                    throw ValidationException::withMessages(['scoring_rule_id' => ['Yeni kuralın soru sayısı bu döneme bağlı yayımlanmış sınavlarla uyuşmuyor.']]);
                }
                $p->scoring_rule_id = $rule->id;
                $p->source_url = $input['source_url'];
                $p->save();
            } else {
                $p = ScoringPeriod::create($input + ['education_type' => $rule->education_type, 'weapon_status' => $rule->weapon_status, 'created_at' => now()]);
            }

            $this->audit($actor, $p->id, $id === null ? 'scoring_period.created' : 'scoring_period.rule_changed');

            return $p->load('rule');
        });
    }

    public function link(User $actor, OfficialExam $exam, ?string $periodId, bool $propagate = true): void
    {
        $this->authorize($actor);
        if ($periodId === null) {
            DB::table('official_exam_scoring')->where('official_exam_id', $exam->id)->delete();
            $exam->unsetRelation('scoringLink');

            return;
        }
        $p = ScoringPeriod::with('rule')->findOrFail($periodId);
        $config = $p->rule->configuration;
        $count = DB::table('official_exam_questions')->where('official_exam_id', $exam->id)->count();
        if ($exam->subject_id !== null || $p->weapon_status !== $exam->weapon_status || $p->exam_date->year !== $exam->year || (string) $p->number !== $exam->exam_number
           || ($exam->published_at !== null && $count !== $config['general_count'] + $config['weapon_count'])) {
            throw ValidationException::withMessages(['scoring_period_id' => ['Puanlama dönemi tam sınavın yılı, numarası, seçeneği ve soru sayısıyla eşleşmeli.']]);
        }
        DB::table('official_exam_scoring')->updateOrInsert(['official_exam_id' => $exam->id], ['scoring_period_id' => $periodId]);
        $exam->unsetRelation('scoringLink');
        $this->audit($actor, $exam->id, 'official_exam.scoring_linked');
        if ($propagate && $exam->published_at && ($exam->generate_unarmed || $exam->derived_from_id)) {
            $other = $exam->derived_from_id ? OfficialExam::findOrFail($exam->derived_from_id) : OfficialExam::where('derived_from_id', $exam->id)->first();
            if ($other) {
                $counterpart = ScoringPeriod::where('education_type', $p->education_type)->where('number', $p->number)->where('weapon_status', $other->weapon_status)->first();
                if (! $counterpart) {
                    throw ValidationException::withMessages(['scoring_period_id' => ['Bağlı diğer seçenek için aynı dönemin kuralı da tanımlanmalı.']]);
                }
                $this->link($actor, $other, $counterpart->id, false);
            }
        }

    }

    private function authorize(User $actor): void
    {
        Gate::forUser(User::whereKey($actor->id)->lockForUpdate()->firstOrFail())->authorize('manage', Question::class);
    }

    private function audit(User $actor, string $id, string $action): void
    {
        DB::table('audit_events')->insert(['id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null, 'target_id' => $id, 'action' => $action, 'created_at' => now()]);
    }
}
