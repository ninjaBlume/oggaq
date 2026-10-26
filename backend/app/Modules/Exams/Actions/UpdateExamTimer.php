<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Exams\ExamClock;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;

class UpdateExamTimer
{
    public function __construct(private ResolveStudyContext $contexts, private ExamClock $clock, private FinalizeExam $finalize) {}

    public function execute(User $actor, string $contextId, string $id, string $action, string $session): ExamAttempt
    {
        return DB::transaction(function () use ($actor, $contextId, $id, $action, $session) {
            $context = $this->contexts->execute($actor, $contextId, true);
            $exam = ExamAttempt::where('study_context_id', $context->id)->whereKey($id)->lockForUpdate()->firstOrFail();
            $this->clock->synchronize($exam);
            if ($exam->finished_at !== null) {
                return $exam;
            }
            if ($exam->pauseMoment() === null && now()->greaterThanOrEqualTo($exam->deadline_at)) {
                return $this->finalize->execute($exam);
            }
            if ($exam->timer_policy !== 'pause_on_exit') {
                return $exam;
            }
            $now = now()->startOfSecond();
            if ($action === 'resume') {
                if ($exam->paused_at === null && $exam->timer_session_id === $session) {
                    $exam->forceFill(['clock_seen_at' => $now])->save();
                } else {
                    $pause = $exam->paused_at === null ? 0 : max(0, (int) $exam->paused_at->diffInSeconds($now));
                    $exam->forceFill(['paused_at' => null, 'paused_seconds' => $exam->paused_seconds + $pause,
                        'deadline_at' => $exam->deadline_at->addSeconds($pause), 'clock_seen_at' => $now,
                        'timer_session_id' => $session, 'revision' => $exam->revision + 1])->save();
                }

                return $exam;
            }
            if ($action === 'pause' && $exam->paused_at !== null && $exam->timer_session_id === null) {
                return $exam;
            }
            if ($exam->timer_session_id !== $session) {
                throw new ApiProblem(409, 'timer_session_conflict', 'Sınav başka bir ekranda açılmış.');
            }
            if ($action === 'pause') {
                if ($exam->paused_at === null) {
                    $exam->forceFill(['paused_at' => $now, 'revision' => $exam->revision + 1])->save();
                }
            } else {
                $this->clock->assertRunning($exam, $session);
                $exam->forceFill(['clock_seen_at' => $now])->save();
            }

            return $exam;
        });
    }
}
