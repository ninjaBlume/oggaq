<?php

namespace App\Modules\QuestionBank\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\Scoring\Actions\ManageScoring;
use App\Modules\Scoring\Models\ScoringPeriod;
use App\Support\ApiProblem;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PublishOfficialExam
{
    // Idempotent: publishing an already published exam returns it unchanged.
    public function execute(User $actor, OfficialExam $exam): OfficialExam
    {
        try {
            return DB::transaction(function () use ($actor, $exam) {
                $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('manage', Question::class);
                $exam = OfficialExam::whereKey($exam->id)->lockForUpdate()->firstOrFail();
                if ($exam->derived_from_id !== null) {
                    throw new ApiProblem(409, 'derived_exam', 'Silahsız seçenek ana silahlı sınavla birlikte yayımlanır.');
                }
                if ($exam->published_at === null) {
                    $count = DB::table('official_exam_questions')->where('official_exam_id', $exam->id)->count();
                    if ($count < 1 || $count > 200) {
                        throw ValidationException::withMessages(['question_version_ids' => ['Yayımlamak için 1–200 soru gerekir.']]);
                    }
                    if ($exam->generate_unarmed && $count !== 125) {
                        throw ValidationException::withMessages(['question_version_ids' => ['İki seçenek için 125 soru gerekir: ilk 100 ortak, son 25 yalnız silahlı.']]);
                    }
                    $unpublished = DB::table('official_exam_questions as q')->join('question_versions as v', 'v.id', '=', 'q.question_version_id')
                        ->where('q.official_exam_id', $exam->id)->whereNull('v.published_at')->orderBy('q.position')->pluck('q.position');
                    if ($unpublished->isNotEmpty()) {
                        throw ValidationException::withMessages(['question_version_ids' => ['Şu sıralardaki soruların sabitlenen sürümü yayımlanmamış: '.$unpublished->implode(', ').'. Soruyu yayımlayıp sınavda yayımlanmış sürümle değiştirin.']]);
                    }
                    if ($exam->scoringLink) {
                        $period = ScoringPeriod::with('rule')->findOrFail($exam->scoringLink->scoring_period_id);
                        if ($count !== $period->rule->configuration['general_count'] + $period->rule->configuration['weapon_count']) {
                            throw ValidationException::withMessages(['scoring_period_id' => ['Puanlama kuralının soru sayısı tam sınavla eşleşmeli.']]);
                        }
                        app(ManageScoring::class)->link($actor, $exam, $exam->scoringLink->scoring_period_id);
                    }
                    $exam->published_at = now();
                    $exam->save();
                    if ($exam->generate_unarmed) {
                        $this->publishUnarmed($actor, $exam);
                    }
                    DB::table('audit_events')->insert([
                        'id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null,
                        'target_id' => $exam->id, 'action' => 'official_exam.published', 'created_at' => now(),
                    ]);
                }

                return $exam->loadCount('questions')->load('source', 'examType', 'subject');
            });
        } catch (UniqueConstraintViolationException) {
            throw new ApiProblem(409, 'unarmed_exam_exists', 'Aynı künye ile silahsız sınav zaten var. Mevcut kayıt otomatik değiştirilmez; iki seçenek birlikte yayımlanamadı.');
        }
    }

    private function publishUnarmed(User $actor, OfficialExam $source): void
    {
        $identity = $source->only(['exam_type_id', 'source_id', 'year', 'term', 'exam_number']);
        $child = new OfficialExam;
        $title = preg_replace('/\s*[—–-]\s*Silahlı\s*$/ui', '', $source->title);
        $child->forceFill($identity + [
            'title' => Str::limit($title, 228, '').' — Silahsız', 'weapon_status' => 'unarmed', 'subject_id' => null,
            'derived_from_id' => $source->id, 'generate_unarmed' => false, 'created_by' => $actor->id,
        ])->save();
        $rows = DB::table('official_exam_questions')->where('official_exam_id', $source->id)->where('position', '<=', 100)->orderBy('position')
            ->get(['position', 'question_id', 'question_version_id'])->map(fn ($row) => (array) $row + ['official_exam_id' => $child->id])->all();
        DB::table('official_exam_questions')->insert($rows);
        $child->published_at = $source->published_at;
        $child->save();
        if ($source->scoringLink) {
            $period = ScoringPeriod::findOrFail($source->scoringLink->scoring_period_id);
            $unarmed = ScoringPeriod::where('education_type', $period->education_type)->where('weapon_status', 'unarmed')->where('number', $period->number)->first();
            if (! $unarmed) {
                throw ValidationException::withMessages(['scoring_period_id' => ['Bu dönem için silahsız puanlama kuralını da tanımlayın.']]);
            }
            app(ManageScoring::class)->link($actor, $child, $unarmed->id);
        }
        DB::table('audit_events')->insert([
            'id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null,
            'target_id' => $child->id, 'action' => 'official_exam.unarmed_derived', 'created_at' => now(),
        ]);
    }
}
