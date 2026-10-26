<?php

namespace App\Modules\Exams;

use App\Modules\Exams\Models\ExamAttempt;
use App\Support\ApiProblem;

class ExamClock
{
    // Caller holds the attempt row lock. A vanished client freezes after a bounded 30-second lease.
    public function synchronize(ExamAttempt $exam): void
    {
        if ($exam->finished_at !== null || $exam->paused_at !== null) {
            return;
        }
        $pause = $exam->pauseMoment();
        if ($pause !== null) {
            $exam->forceFill(['paused_at' => $pause, 'revision' => $exam->revision + 1])->save();
        }
    }

    public function assertRunning(ExamAttempt $exam, ?string $session): void
    {
        if ($exam->timer_policy !== 'pause_on_exit') {
            return;
        }
        if ($exam->pauseMoment() !== null) {
            throw new ApiProblem(409, 'exam_paused', 'Süre duraklatıldı. Devam ederek sınavı sürdürebilirsin.');
        }
        if ($session === null || $exam->timer_session_id !== $session) {
            throw new ApiProblem(409, 'timer_session_conflict', 'Sınav başka bir ekranda açılmış. Bu ekranda devam etmek için süreyi yeniden başlat.');
        }
    }
}
