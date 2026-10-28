<?php

namespace App\Modules\Exams\Actions;

use App\Modules\Exams\RandomExamSelection;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\Scoring\Models\ScoringPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SelectRandomExamQuestions
{
    public function execute(string $education, string $weapon): RandomExamSelection
    {
        // A published full booklet supplies observed quotas, not an invented legal percentage.
        // Import time is not exam order: an old booklet can have been imported yesterday.
        $reference = OfficialExam::whereNotNull('published_at')->whereNull('subject_id')->where('education_type', $education)
            ->where('weapon_status', 'armed')->has('questions', '=', 125)->orderByDesc('year')
            ->orderByRaw("CASE WHEN exam_number ~ '^[0-9]+$' THEN exam_number::integer ELSE 0 END DESC")
            ->orderByDesc('published_at')->orderBy('id')->first();
        if (! $reference) {
            throw ValidationException::withMessages(['education_type' => ['Bu eğitim için dağılımı doğrulanmış 125 soruluk yayımlanmış sınav bulunamadı.']]);
        }
        $rows = DB::table('official_exam_questions as oq')->join('question_versions as v', 'v.id', '=', 'oq.question_version_id')
            ->join('subjects as s', 's.id', '=', 'v.subject_id')->leftJoin('topics as t', 't.id', '=', 'v.topic_id')
            ->where('oq.official_exam_id', $reference->id)->orderBy('oq.position')
            ->get(['oq.position', 'v.subject_id', 'v.topic_id', 's.name as subject_name', 't.name as topic_name']);
        if ($rows->count() !== 125) {
            throw ValidationException::withMessages(['education_type' => ['Referans sınavın soru dağılımı eksik. Yeni sınav oluşturulmadı.']]);
        }
        $distribution = $rows->filter(fn ($row) => $this->includes($weapon, $row->position))
            ->groupBy(fn ($row) => $this->key($row->subject_id, $row->topic_id, $row->position <= 100 ? 'general' : 'weapon'))
            ->map(function (Collection $group) {
                $row = $group->first();

                return ['subject_id' => $row->subject_id, 'subject_name' => $row->subject_name, 'topic_id' => $row->topic_id,
                    'topic_name' => $row->topic_name, 'section' => $row->position <= 100 ? 'general' : 'weapon', 'question_count' => $group->count()];
            })->values();
        // De-duplicate membership joins: sharing a question across 20 booklets must not give it 20 lottery tickets.
        $pool = DB::table('official_exam_questions as oq')->join('official_exams as e', 'e.id', '=', 'oq.official_exam_id')
            ->join('questions as q', 'q.id', '=', 'oq.question_id')->join('question_versions as v', 'v.id', '=', 'q.published_version_id')
            ->whereNotNull('e.published_at')->whereNull('e.subject_id')->where('e.education_type', $education)
            ->where('e.weapon_status', 'armed')->whereRaw('(SELECT count(*) FROM official_exam_questions full_exam WHERE full_exam.official_exam_id = e.id) = 125')->whereNotNull('v.published_at')
            ->select(['q.id as question_id', 'v.id as question_version_id', 'v.subject_id', 'v.topic_id'])
            ->selectRaw("CASE WHEN oq.position <= 100 THEN 'general' ELSE 'weapon' END as section")->distinct()->get()->shuffle();
        $picked = collect();
        $used = [];
        foreach ($distribution as $quota) {
            $eligible = $pool->filter(fn ($row) => ! isset($used[$row->question_id])
                && $this->key($row->subject_id, $row->topic_id, $row->section) === $this->key($quota['subject_id'], $quota['topic_id'], $quota['section']))
                ->take($quota['question_count']);
            if ($eligible->count() !== $quota['question_count']) {
                throw ValidationException::withMessages(['education_type' => ['Ders ve konu ağırlıklarını koruyacak yeterli farklı yayımlanmış soru yok. Yeni sınav oluşturulmadı.']]);
            }
            foreach ($eligible as $row) {
                $used[$row->question_id] = true;
                $picked->push(['question_id' => $row->question_id, 'question_version_id' => $row->question_version_id, 'section' => $row->section]);
            }
        }
        // Keep 1–100 general and 101–125 weapon for the existing scoring engine; randomize within each section.
        $picked = $picked->where('section', 'general')->shuffle()->concat($picked->where('section', 'weapon')->shuffle())
            ->map(fn ($row) => ['question_id' => $row['question_id'], 'question_version_id' => $row['question_version_id']])->values();

        return new RandomExamSelection($picked, ['random_education_type' => $education, 'random_weapon_status' => $weapon,
            'random_reference_exam_id' => $reference->id, 'random_distribution' => $distribution->all(),
            'random_scoring_period_id' => $this->scoringPeriod($reference, $education, $weapon)]);
    }

    private function includes(string $weapon, int $position): bool
    {
        return $weapon === 'armed' || ($weapon === 'unarmed' ? $position <= 100 : $position > 100);
    }

    private function key(string $subject, ?string $topic, string $section): string
    {
        return $section.'|'.$subject.'|'.($topic ?? '');
    }

    private function scoringPeriod(OfficialExam $reference, string $education, string $weapon): ?string
    {
        // No rule is inferred from counts. A verified matching period must actually exist.
        if ($weapon === 'weapon_difference' && $education !== 'basic') {
            return null;
        }
        $period = ScoringPeriod::with('rule')->where('education_type', $weapon === 'weapon_difference' ? 'weapon_difference' : $education)
            ->where('weapon_status', $weapon === 'unarmed' ? 'unarmed' : 'armed')->where('number', $reference->exam_number)->first();
        $c = $period?->rule?->configuration;

        return $period?->rule?->published_at !== null && $period->rule->archived_at === null
            && ($c['general_count'] ?? null) === ($weapon === 'weapon_difference' ? 0 : 100)
            && ($c['weapon_count'] ?? null) === ($weapon === 'unarmed' ? 0 : 25) ? $period->id : null;
    }
}
