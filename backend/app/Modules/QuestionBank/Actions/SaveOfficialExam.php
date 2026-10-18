<?php

namespace App\Modules\QuestionBank\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionVersion;
use App\Support\ApiProblem;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// Creates or replaces a draft past exam. The ordered question_version_ids define the original order and answer keys.
class SaveOfficialExam
{
    public function execute(User $actor, array $attributes, ?OfficialExam $exam = null): OfficialExam
    {
        try {
            return DB::transaction(function () use ($actor, $attributes, $exam) {
                $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('manage', Question::class);
                $creating = $exam === null;
                if ($creating) {
                    $exam = new OfficialExam;
                    $exam->created_by = $actor->id;
                } else {
                    $exam = OfficialExam::whereKey($exam->id)->lockForUpdate()->firstOrFail();
                    if ($exam->published_at !== null) {
                        throw new ApiProblem(409, 'already_published', 'Yayımlanmış çıkmış sınav değiştirilemez.');
                    }
                }
                $versions = $this->versions($attributes['question_version_ids']);
                $exam->forceFill([
                    'exam_type_id' => $attributes['exam_type_id'], 'source_id' => $attributes['source_id'] ?? null,
                    'title' => $attributes['title'], 'year' => $attributes['year'],
                    'term' => $attributes['term'] ?? null, 'exam_number' => $attributes['exam_number'] ?? null,
                ])->save();
                DB::table('official_exam_questions')->where('official_exam_id', $exam->id)->delete();
                foreach ($attributes['question_version_ids'] as $index => $versionId) {
                    DB::table('official_exam_questions')->insert([
                        'official_exam_id' => $exam->id, 'position' => $index + 1,
                        'question_id' => $versions[$versionId]->question_id, 'question_version_id' => $versionId,
                    ]);
                }
                DB::table('audit_events')->insert([
                    'id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null,
                    'target_id' => $exam->id, 'action' => $creating ? 'official_exam.created' : 'official_exam.revised', 'created_at' => now(),
                ]);

                return $exam->loadCount('questions')->load('source');
            });
        } catch (UniqueConstraintViolationException) {
            throw new ApiProblem(409, 'duplicate_official_exam', 'Bu sınav türü, yıl, dönem ve numara için kayıt zaten var.');
        }
    }

    // Each question may appear once per exam; the same question can be used by other exams.
    private function versions(array $ids): Collection
    {
        $versions = QuestionVersion::whereIn('id', $ids)->whereNotNull('published_at')->get()->keyBy('id');
        if ($versions->count() !== count($ids) || $versions->pluck('question_id')->unique()->count() !== count($ids)) {
            throw ValidationException::withMessages(['question_version_ids' => ['Her soru bir kez ve yayımlanmış sürümüyle eklenmelidir.']]);
        }

        return $versions;
    }
}
