<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\Exams\OfflinePackageSignature;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class ImportOfflineExam
{
    public function execute(User $actor, string $contextId, array $input, array $claim): ExamAttempt
    {
        return DB::transaction(function () use ($actor, $contextId, $input, $claim) {
            $context = app(ResolveStudyContext::class)->execute($actor, $contextId, true);
            if ($context->tenant_id !== null || $context->membership_id !== null) {
                throw new ApiProblem(403, 'offline_personal_only', 'Çevrimdışı sınavlar yalnız kişisel kullanım içindir.');
            }
            if (! Schema::hasTable('offline_exam_imports')) {
                throw new ApiProblem(503, 'offline_sync_unavailable', 'Çevrimdışı sonuç eşitlemesi henüz hazır değil; kayıt cihazda korunuyor.');
            }
            app(OfflinePackageSignature::class)->verify($claim, $input['package_id'], $input['signature'], $actor->id, $context->id);
            $answers = $input['answers'];
            ksort($answers);
            $canonical = [$input['id'], $claim, $input['package_id'], $input['signature'], $input['duration_seconds'], $input['started_at'], $input['finished_at'], $input['elapsed_seconds'], $answers];
            $hash = hash('sha256', json_encode($canonical, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
            $existing = ExamAttempt::whereKey($input['id'])->lockForUpdate()->first();
            if ($existing !== null) {
                $receipt = DB::table('offline_exam_imports')->where('exam_attempt_id', $existing->id)->first();
                if ($existing->study_context_id !== $context->id || $receipt === null || ! hash_equals($receipt->payload_hash, $hash)) {
                    throw new ApiProblem(409, 'offline_import_conflict', 'Bu sınav kimliği farklı bir kayıt için kullanılmış; cihazdaki kayıt korundu.');
                }

                return $existing->load(['answers.questionVersion.options', 'answers.questionVersion.source', 'offlineImport']);
            }
            $exam = OfficialExam::whereNotNull('published_at')->whereKey($claim['official_exam_id'])->lockForUpdate()->firstOrFail();
            $actual = DB::table('official_exam_questions')->where('official_exam_id', $exam->id)->orderBy('position')->get(['question_id', 'question_version_id', 'position'])
                ->map(fn ($row) => ['question_id' => $row->question_id, 'question_version_id' => $row->question_version_id, 'position' => $row->position])->all();
            $periodId = $exam->scoringLink?->scoring_period_id;
            $ruleId = $periodId ? DB::table('scoring_periods')->where('id', $periodId)->sharedLock()->value('scoring_rule_id') : null;
            if ($actual !== $claim['questions'] || $periodId !== $claim['scoring_period_id'] || $ruleId !== $claim['scoring_rule_id']) {
                throw new ApiProblem(409, 'offline_package_changed', 'Sınav veya puanlama güncellendi; cihazdaki kayıt korundu.');
            }
            $validIds = array_column($actual, 'question_id');
            if (count(array_diff(array_keys($answers), $validIds)) > 0) {
                throw ValidationException::withMessages(['answers' => ['Cevaplardan biri bu sınava ait değil.']]);
            }
            $attempt = app(StartExam::class)->execute($actor, $context->id, [
                'id' => $input['id'], 'official_exam_id' => $exam->id, 'duration_seconds' => $input['duration_seconds'], 'timer_policy' => 'continuous',
            ]);
            foreach ($attempt->answers as $row) {
                $option = $answers[$row->question_id] ?? null;
                if ($option === null) {
                    continue;
                }
                if (! $row->questionVersion->options->contains('id', $option)) {
                    throw ValidationException::withMessages(['answers' => ['Seçenek ilgili soru sürümüne ait değil.']]);
                }
                $row->forceFill(['selected_option_id' => $option, 'changed_revision' => 2])->save();
            }
            if ($answers !== []) {
                $attempt->forceFill(['revision' => 2])->save();
            }
            app(FinalizeExam::class)->execute($attempt);
            DB::table('offline_exam_imports')->insert(['exam_attempt_id' => $attempt->id, 'payload_hash' => $hash,
                'client_started_at' => $input['started_at'], 'client_finished_at' => $input['finished_at'],
                'client_elapsed_seconds' => $input['elapsed_seconds'], 'received_at' => now()]);

            return $attempt->load(['answers.questionVersion.options', 'answers.questionVersion.source', 'offlineImport']);
        }, 3);
    }
}
