<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class StartRandomExam
{
    public function current(User $actor, string $contextId): ?ExamAttempt
    {
        $this->assertAvailable();

        return DB::transaction(function () use ($actor, $contextId) {
            // Same user row lock as every exam write: two devices cannot both create a new random exam.
            $context = app(ResolveStudyContext::class)->execute($actor, $contextId, true);

            return $this->active($actor, $context->id, compact: true);
        });
    }

    public function execute(User $actor, string $contextId, array $input): ExamAttempt
    {
        $this->assertAvailable();

        return DB::transaction(function () use ($actor, $contextId, $input) {
            $context = app(ResolveStudyContext::class)->execute($actor, $contextId, true);
            $existing = ExamAttempt::whereKey($input['id'])->first();
            if ($existing) {
                if ($existing->study_context_id !== $context->id || $existing->random_education_type !== $input['education_type']
                    || $existing->random_weapon_status !== $input['weapon_status'] || $existing->duration_seconds !== (int) $input['duration_seconds']
                    || $existing->timer_policy !== ($input['timer_policy'] ?? 'continuous')) {
                    throw new ApiProblem(409, 'idempotency_conflict', 'Bu işlem kimliği farklı bir sınav için kullanılmış.');
                }

                return app(AccessExam::class)->execute($actor, $context->id, $existing->id);
            }
            // An unfinished random exam wins even if the student selects different settings on another device.
            if ($active = $this->active($actor, $context->id)) {
                return $active;
            }
            $selection = app(SelectRandomExamQuestions::class)->execute($input['education_type'], $input['weapon_status']);
            $count = ['armed' => 125, 'unarmed' => 100, 'weapon_difference' => 25][$input['weapon_status']];

            return app(StartExam::class)->execute($actor, $context->id, [
                'id' => $input['id'], 'question_count' => $count, 'duration_seconds' => $input['duration_seconds'],
                'timer_policy' => $input['timer_policy'] ?? 'continuous',
            ], $selection);
        });
    }

    private function active(User $actor, string $contextId, bool $compact = false): ?ExamAttempt
    {
        $id = ExamAttempt::where('study_context_id', $contextId)->whereNotNull('random_weapon_status')->whereNull('finished_at')->value('id');
        if (! $id) {
            return null;
        }
        // Apply the existing authoritative expiry/pause rules before deciding whether a new exam is allowed.
        $exam = app(AccessExam::class)->execute($actor, $contextId, $id, compact: $compact);

        return $exam->finished_at === null ? $exam : null;
    }

    private function assertAvailable(): void
    {
        if (! Schema::hasColumn('exam_attempts', 'random_weapon_status')) {
            throw new ApiProblem(503, 'random_exam_unavailable', 'Rastgele sınav için sunucu güncellemesi gerekiyor.');
        }
    }
}
