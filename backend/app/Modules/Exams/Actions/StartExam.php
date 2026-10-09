<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Exams\Models\ExamAnswer;
use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Support\ApiProblem;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StartExam
{
    public function __construct(private ResolveStudyContext $contexts) {}

    public function execute(User $actor, string $contextId, array $input): ExamAttempt
    {
        try {
            return DB::transaction(function () use ($actor, $contextId, $input) {
                $context = $this->contexts->execute($actor, $contextId, true);
                $settings = ['question_count' => (int) $input['question_count'], 'duration_seconds' => (int) $input['duration_seconds'], 'subject_id' => $input['subject_id'] ?? null, 'topic_id' => $input['topic_id'] ?? null];
                $existing = ExamAttempt::where('study_context_id', $context->id)->whereKey($input['id'])->lockForUpdate()->first();
                if ($existing) {
                    foreach ($settings as $key => $value) {
                        if ($value !== $existing->$key) {
                            throw new ApiProblem(409, 'idempotency_conflict', 'Bu işlem kimliği farklı bir deneme için kullanılmış.');
                        }
                    }
                    if ($existing->finished_at === null && now()->greaterThanOrEqualTo($existing->deadline_at)) {
                        app(FinalizeExam::class)->execute($existing);
                    }

                    return $existing->load(['answers.questionVersion.options', 'answers.questionVersion.source']);
                }
                $eligible = Question::whereNotNull('published_version_id');
                foreach (['subject_id', 'topic_id'] as $filter) {
                    if ($settings[$filter] !== null) {
                        $eligible->whereHas('publishedVersion', fn ($query) => $query->where($filter, $settings[$filter]));
                    }
                }
                $ids = (clone $eligible)->inRandomOrder()->limit($settings['question_count'])->pluck('id');
                // Acquire all content locks in one deterministic order; retain random order in the snapshot.
                $questions = (clone $eligible)->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                if ($questions->count() !== $settings['question_count']) {
                    throw ValidationException::withMessages(['question_count' => ['Bu seçimde yeterli yayımlanmış soru yok. Daha az soru seçin.']]);
                }
                $startedAt = now()->startOfSecond();
                $attempt = new ExamAttempt;
                $attempt->forceFill($settings + [
                    'id' => $input['id'], 'study_context_id' => $context->id, 'scoring_rule' => 'correct_ratio_v1',
                    'revision' => 1, 'started_at' => $startedAt, 'deadline_at' => $startedAt->copy()->addSeconds($settings['duration_seconds']),
                ])->save();
                foreach ($ids as $position => $id) {
                    (new ExamAnswer)->forceFill([
                        'exam_attempt_id' => $attempt->id, 'question_id' => $id,
                        'question_version_id' => $questions[$id]->published_version_id, 'position' => $position + 1,
                    ])->save();
                }

                return $attempt->load(['answers.questionVersion.options', 'answers.questionVersion.source']);
            });
        } catch (UniqueConstraintViolationException $exception) {
            throw new ApiProblem(409, 'idempotency_conflict', 'Bu işlem kimliği farklı bir deneme için kullanılmış.');
        }
    }
}
