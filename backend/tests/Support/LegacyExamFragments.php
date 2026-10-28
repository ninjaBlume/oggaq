<?php

namespace Tests\Support;

use App\Models\User;
use App\Modules\Exams\Actions\AccessExam;
use App\Modules\Exams\Actions\StartExam;
use App\Modules\Exams\RandomExamSelection;
use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LegacyExamFragments
{
    public static function create(User $admin, User $student): array
    {
        if (DB::getDatabaseName() !== 'oggaq_test') {
            throw new \RuntimeException('Synthetic fragments require oggaq_test.');
        }
        $pool = RandomExamPool::create($admin);
        $source = app(SaveOfficialExam::class)->execute($admin, ['exam_type_id' => $pool['reference']->exam_type_id,
            'title' => 'Sentetik asıl ders sınavı', 'year' => 2026, 'exam_number' => '122', 'weapon_status' => 'armed',
            'subject_id' => $pool['subjects'][0]->id, 'question_version_ids' => array_slice($pool['versions'], 0, 18)]);
        app(PublishOfficialExam::class)->execute($admin, $source);
        $context = $student->studyContexts()->whereNull('tenant_id')->firstOrFail()->id;
        $clock = Carbon::getTestNow();
        try {
            Carbon::setTestNow(now()->subMinutes(10));
            $original = app(StartExam::class)->execute($student, $context, ['id' => (string) Str::uuid(), 'official_exam_id' => $source->id, 'duration_seconds' => 900]);
            $questions = $original->answers->map(fn ($answer) => ['question_id' => $answer->question_id, 'question_version_id' => $answer->question_version_id]);
            self::complete($student, $context, $original, 7);
            $fragments = [];
            foreach ([1, 11] as $count) {
                Carbon::setTestNow(now()->addSeconds(2));
                // Reproduce the old review bug: fixed source questions, but no review_kind was persisted.
                $part = app(StartExam::class)->execute($student, $context, ['id' => (string) Str::uuid(), 'question_count' => $count, 'duration_seconds' => 600], new RandomExamSelection($questions->slice(7, $count)->values(), []));
                self::complete($student, $context, $part, $count === 1 ? 1 : 10);
                $fragments[] = $part->id;
            }

            return ['context' => $context, 'original' => $original->id, 'source' => $source->id, 'fragments' => $fragments];
        } finally {
            Carbon::setTestNow($clock);
        }
    }

    private static function complete(User $actor, string $context, $exam, int $correct): void
    {
        foreach ($exam->answers as $index => $answer) {
            $option = $answer->questionVersion->options[$index < $correct ? 0 : 1]->id;
            $exam = app(AccessExam::class)->execute($actor, $context, $exam->id, ['answer_id' => $answer->id, 'base_version' => $exam->revision, 'selected_option_id' => $option]);
        }
        app(AccessExam::class)->execute($actor, $context, $exam->id, finishRevision: $exam->revision);
    }
}
