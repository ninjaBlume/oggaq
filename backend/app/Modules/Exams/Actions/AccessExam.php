<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Support\ApiProblem;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AccessExam
{
    public function __construct(private ResolveStudyContext $contexts, private FinalizeExam $finalize) {}

    // Every read/write returns the canonical state and automatically closes an expired attempt.
    public function execute(User $actor, string $contextId, string $id, ?array $answer = null, ?int $finishRevision = null, bool $compact = false): ExamAttempt
    {
        try {
            return DB::transaction(function () use ($actor, $contextId, $id, $answer, $finishRevision, $compact) {
                $context = $this->contexts->execute($actor, $contextId, true);
                $attempt = ExamAttempt::where('study_context_id', $context->id)->whereKey($id)->lockForUpdate()->firstOrFail();
                if ($attempt->finished_at === null && now()->greaterThanOrEqualTo($attempt->deadline_at)) {
                    $this->finalize->execute($attempt);
                }
                if ($attempt->finished_at === null && $answer !== null) {
                    $this->saveAnswer($attempt, $answer);
                }
                if ($attempt->finished_at === null && $finishRevision !== null) {
                    if ($attempt->revision !== $finishRevision) {
                        throw new ApiProblem(409, 'version_conflict', 'Deneme başka bir işlemde güncellendi. Bitirmeden önce kaydı yenileyin.');
                    }
                    $this->finalize->execute($attempt);
                }

                return $attempt->load($compact ? ['answers'] : ['answers.questionVersion.options', 'answers.questionVersion.source']);
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

    // Conflicts are per answer: a stale revision only blocks a different value for an answer changed after it.
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
        if ($row->changed_revision > (int) $input['base_version']) {
            throw new ApiProblem(409, 'version_conflict', 'Deneme başka bir işlemde güncellendi. Güncel kaydı yükleyin.');
        }
        $row->forceFill(['selected_option_id' => $option, 'changed_revision' => $attempt->revision + 1])->save();
        $attempt->forceFill(['revision' => $attempt->revision + 1])->save();
    }
}
