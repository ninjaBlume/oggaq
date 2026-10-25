<?php

namespace App\Modules\Import;

use App\Models\User;
use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\Subject;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use RuntimeException;

// Derive subject templates from an immutable published booklet, without copying questions or scoring whole exams as lessons.
class SubjectExamImport
{
    public function preview(User $actor, OfficialExam $exam): array
    {
        Gate::forUser($actor)->authorize('manage', Question::class);
        $exam = $exam->fresh(['questions.questionVersion']);
        if (! $exam->published_at || $exam->subject_id || $exam->derived_from_id || $exam->weapon_status !== 'armed'
            || $exam->questions->count() !== 125 || $exam->questions->contains(fn ($q) => ! $q->questionVersion->published_at)) {
            throw new RuntimeException('Yayımlanmış 125 soruluk ana silahlı kitapçık gerekli.');
        }
        $groups = [];
        $subjects = Subject::all()->keyBy('id');
        foreach ($exam->questions as $q) {
            $subject = $subjects[$q->questionVersion->subject_id];
            $groups[$subject->id] ??= ['subject_id' => $subject->id, 'subject_name' => $subject->name, 'versions' => []];
            $groups[$subject->id]['versions'][] = $q->question_version_id;
        }
        $snapshot = ['exam_id' => $exam->id, 'education_type' => $exam->education_type, 'exam_number' => $exam->exam_number,
            'year' => $exam->year, 'term' => $exam->term, 'source_id' => $exam->source_id, 'groups' => array_values($groups)];

        return $snapshot + ['approval' => substr(hash('sha256', json_encode($snapshot, JSON_THROW_ON_ERROR)), 0, 12)];
    }

    public function commit(User $actor, OfficialExam $exam, string $approval): array
    {
        return DB::transaction(function () use ($actor, $exam, $approval) {
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('manage', Question::class);
            DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', ['subject-booklet:'.$exam->id]);
            $plan = $this->preview($actor, $exam);
            if (! hash_equals($plan['approval'], $approval)) {
                throw new RuntimeException('Ders önizlemesi onay koduyla eşleşmiyor.');
            }
            $type = ExamType::where('code', 'ogg-ders')->firstOrFail();
            $created = $reused = 0;
            $exams = [];
            foreach ($plan['groups'] as $group) {
                $identity = ['education_type' => $plan['education_type'], 'exam_type_id' => $type->id, 'year' => $plan['year'],
                    'term' => $plan['term'], 'exam_number' => $plan['exam_number'], 'subject_id' => $group['subject_id'], 'weapon_status' => null];
                $existing = OfficialExam::with('questions')->where($identity)->first();
                if ($existing) {
                    if (! $existing->published_at || $existing->source_id !== $plan['source_id'] || $existing->scoringLink
                        || $existing->questions->pluck('question_version_id')->all() !== $group['versions']) {
                        throw new RuntimeException('Mevcut ders sınavı kaynak/sürüm önizlemesiyle eşleşmiyor; üzerine yazılmadı.');
                    }
                    $lesson = $existing;
                    $reused++;
                } else {
                    $lesson = app(SaveOfficialExam::class)->execute($actor, $identity + ['source_id' => $plan['source_id'],
                        'title' => 'ÖGG '.$plan['exam_number'].'. '.($plan['education_type'] === 'renewal' ? 'Yenileme ' : '').'Ders Sınavı — '.$group['subject_name'],
                        'generate_unarmed' => false, 'question_version_ids' => $group['versions']]);
                    $lesson = app(PublishOfficialExam::class)->execute($actor, $lesson);
                    $created++;
                }
                $exams[] = ['id' => $lesson->id, 'subject_id' => $group['subject_id'], 'question_count' => count($group['versions'])];
            }
            DB::statement('SET CONSTRAINTS ALL IMMEDIATE');
            if ($created) {
                DB::table('audit_events')->insert(['id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null,
                    'target_id' => $exam->id, 'action' => 'import.subject_exams_committed', 'created_at' => now()]);
            }

            return ['source_exam_id' => $exam->id, 'created_subject_exams' => $created, 'reused_subject_exams' => $reused, 'question_count' => 125, 'exams' => $exams];
        });
    }
}
