<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\Exams\Models\ExamBookmark;
use App\Modules\Study\Actions\ResolveStudyContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaveExamPosition
{
    public function __construct(private ResolveStudyContext $contexts, private FinalizeExam $finalize) {}

    public function execute(User $actor, string $contextId, string $id, int $position): ExamAttempt
    {
        return DB::transaction(function () use ($actor, $contextId, $id, $position) {
            $context = $this->contexts->execute($actor, $contextId, true);
            $attempt = ExamAttempt::where('study_context_id', $context->id)->whereKey($id)->lockForUpdate()->firstOrFail();
            if ($position > $attempt->question_count) {
                throw ValidationException::withMessages(['position' => ['Soru konumu bu sınavın soru sayısını aşamaz.']]);
            }
            if ($attempt->finished_at === null && now()->greaterThanOrEqualTo($attempt->deadline_at)) {
                $this->finalize->execute($attempt);
            }
            if ($attempt->finished_at === null) {
                // A bookmark is navigation state: it never changes the answer revision or extends the deadline.
                ExamBookmark::updateOrCreate(['exam_attempt_id' => $attempt->id], ['position' => $position]);
            }

            return $attempt->load('bookmark');
        });
    }
}
