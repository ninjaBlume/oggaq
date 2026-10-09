<?php

namespace App\Modules\Study\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\Study\Models\PracticeAttempt;
use App\Support\ApiProblem;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class StartPracticeAttempt
{
    public function __construct(private ResolveStudyContext $contexts) {}

    public function execute(User $actor, string $contextId, array $input): PracticeAttempt
    {
        try {
            return DB::transaction(function () use ($actor, $contextId, $input) {
                $context = $this->contexts->execute($actor, $contextId, true);
                $existing = PracticeAttempt::where('study_context_id', $context->id)->whereKey($input['id'])->lockForUpdate()->first();
                if ($existing) {
                    if ($existing->study_context_id !== $context->id || $existing->question_id !== $input['question_id'] || $existing->question_version_id !== $input['question_version_id']) {
                        throw new ApiProblem(409, 'idempotency_conflict', 'Bu işlem kimliği farklı bir çözüm için kullanılmış.');
                    }

                    return $existing->load(['questionVersion.options', 'questionVersion.source']);
                }
                $question = Question::whereNotNull('published_version_id')->whereKey($input['question_id'])->lockForUpdate()->firstOrFail();
                if ($question->published_version_id !== $input['question_version_id']) {
                    throw new ApiProblem(409, 'question_changed', 'Sorunun yayımlanmış sürümü değişti. Listeyi yenileyip tekrar açın.');
                }
                $attempt = new PracticeAttempt;
                $attempt->forceFill([
                    'id' => $input['id'], 'study_context_id' => $context->id,
                    'question_id' => $question->id, 'question_version_id' => $question->published_version_id,
                ])->save();

                return $attempt->load(['questionVersion.options', 'questionVersion.source']);
            });
        } catch (UniqueConstraintViolationException $exception) {
            throw new ApiProblem(409, 'idempotency_conflict', 'Bu işlem kimliği farklı bir çözüm için kullanılmış.');
        }
    }
}
