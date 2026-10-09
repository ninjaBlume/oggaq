<?php

namespace App\Modules\Study\Actions;

use App\Models\User;
use App\Modules\Study\Models\PracticeAttempt;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AnswerPracticeAttempt
{
    public function __construct(private ResolveStudyContext $contexts) {}

    public function execute(User $actor, string $contextId, string $attemptId, ?string $optionId): PracticeAttempt
    {
        return DB::transaction(function () use ($actor, $contextId, $attemptId, $optionId) {
            $context = $this->contexts->execute($actor, $contextId, true);
            $attempt = PracticeAttempt::where('study_context_id', $context->id)->whereKey($attemptId)->lockForUpdate()->firstOrFail();
            $attempt->load(['questionVersion.options', 'questionVersion.source']);
            if ($attempt->answered_at !== null) {
                if ($attempt->selected_option_id !== $optionId) {
                    throw new ApiProblem(409, 'answer_locked', 'Bu çözüm tamamlandı. Yeniden çözmek için yeni bir çalışma açın.');
                }

                return $attempt;
            }
            if ($optionId !== null && ! $attempt->questionVersion->options->contains('id', $optionId)) {
                throw ValidationException::withMessages(['selected_option_id' => ['Seçenek bu soru sürümüne ait değil.']]);
            }
            $attempt->forceFill([
                'selected_option_id' => $optionId,
                'is_correct' => $optionId !== null && $optionId === $attempt->questionVersion->correct_option_id,
                'answered_at' => now(),
            ])->save();

            return $attempt;
        });
    }
}
