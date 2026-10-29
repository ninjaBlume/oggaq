<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Exams\ExamClock;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Support\ApiProblem;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AccessExam
{
    public function __construct(private ResolveStudyContext $contexts, private FinalizeExam $finalize) {}

    // Every read/write returns the canonical state and automatically closes an expired attempt.
    public function execute(User $actor, string $contextId, string $id, ?array $answer = null, ?int $finishRevision = null, bool $compact = false, ?string $timerSession = null): ExamAttempt
    {
        try {
            return DB::transaction(function () use ($actor, $contextId, $id, $answer, $finishRevision, $compact, $timerSession) {
                $context = $this->contexts->execute($actor, $contextId, true);
                $attempt = ExamAttempt::where('study_context_id', $context->id)->whereKey($id)->lockForUpdate()->firstOrFail();
                $clock = app(ExamClock::class);
                $clock->synchronize($attempt);
                if ($attempt->finished_at === null && $attempt->pauseMoment() === null && now()->greaterThanOrEqualTo($attempt->deadline_at)) {
                    $this->finalize->execute($attempt);
                }
                if ($attempt->finished_at === null && $answer !== null) {
                    $clock->assertRunning($attempt, $answer['timer_session_id'] ?? $timerSession);
                    $this->saveAnswer($attempt, $answer);
                }
                if ($attempt->finished_at === null && $finishRevision !== null) {
                    $clock->assertRunning($attempt, $timerSession);
                    if ($attempt->revision !== $finishRevision) {
                        throw new ApiProblem(409, 'version_conflict', 'Deneme başka bir işlemde güncellendi. Bitirmeden önce kaydı yenileyin.');
                    }
                    $this->finalize->execute($attempt);
                }

                $relations = $compact ? ['answers.questionVersion:id,correct_option_id,explanation'] : ['answers.questionVersion.options', 'answers.questionVersion.source'];
                if (Schema::hasTable('offline_exam_imports')) {
                    $relations[] = 'offlineImport';
                }

                return $attempt->load($relations);
            });
        } catch (QueryException $exception) {
            // A deadline can cross between the application check and the database write.
            // Roll the write back and return the authoritative completed state.
            if ($exception->getCode() === '23514' && str_contains($exception->getMessage(), 'Exam deadline has passed')) {
                return $this->execute($actor, $contextId, $id, compact: $compact);
            }
            throw $exception;
        }
    }

    // Revealing the key commits the first choice; an identical retry remains safe.
    private function saveAnswer(ExamAttempt $attempt, array $input): void
    {
        $row = $attempt->answers()->whereKey($input['answer_id'])->with('questionVersion.options')->firstOrFail();
        $option = $input['selected_option_id'];
        if ($option !== null && ! $row->questionVersion->options->contains('id', $option)) {
            throw ValidationException::withMessages(['selected_option_id' => ['Seçenek bu soru sürümüne ait değil.']]);
        }
        if ($row->selected_option_id === $option) {
            return;
        }
        if ($row->selected_option_id !== null) {
            throw new ApiProblem(409, 'answer_locked', 'Bu soru yanıtlandı. Doğru cevap gösterildiği için yanıt değiştirilemez.');
        }
        if ($row->changed_revision > (int) $input['base_version']) {
            throw new ApiProblem(409, 'version_conflict', 'Deneme başka bir işlemde güncellendi. Güncel kaydı yükleyin.');
        }
        $row->forceFill(['selected_option_id' => $option, 'changed_revision' => $attempt->revision + 1])->save();
        $attempt->forceFill(['revision' => $attempt->revision + 1])->save();
    }
}
