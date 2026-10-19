<?php

namespace App\Modules\QuestionBank\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionVersion;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// Moves one pinned question of an exam to another version of the same question without touching order or membership.
// A draft exam may take any version; a published exam only a newer published one (an audited correction). Attempts
// that already started keep the versions they copied.
class UpdateOfficialExamQuestion
{
    public function execute(User $actor, OfficialExam $exam, string $questionId, string $versionId): OfficialExam
    {
        return DB::transaction(function () use ($actor, $exam, $questionId, $versionId) {
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('manage', Question::class);
            $exam = OfficialExam::whereKey($exam->id)->lockForUpdate()->firstOrFail();
            $row = DB::table('official_exam_questions')->where('official_exam_id', $exam->id)->where('question_id', $questionId)->lockForUpdate()->first();
            if ($row === null) {
                throw new ApiProblem(404, 'not_found', 'Soru bu sınavda yer almıyor.');
            }
            $next = QuestionVersion::whereKey($versionId)->where('question_id', $questionId)->first();
            if ($next === null) {
                throw ValidationException::withMessages(['question_version_id' => ['Sürüm bu soruya ait değil.']]);
            }
            if ($row->question_version_id === $next->id) {
                return $exam;
            }
            if ($exam->published_at !== null) {
                $current = QuestionVersion::findOrFail($row->question_version_id);
                if ($next->published_at === null || $next->version <= $current->version) {
                    throw ValidationException::withMessages(['question_version_id' => ['Yayımlanmış sınavda yalnız sorunun daha yeni yayımlanmış sürümü kullanılabilir.']]);
                }
            }
            DB::table('official_exam_questions')->where('official_exam_id', $exam->id)->where('question_id', $questionId)->update(['question_version_id' => $next->id]);
            $now = now();
            DB::table('official_exam_question_changes')->insert([
                'id' => Str::uuid(), 'official_exam_id' => $exam->id, 'question_id' => $questionId,
                'from_version_id' => $row->question_version_id, 'to_version_id' => $next->id, 'actor_id' => $actor->id, 'created_at' => $now,
            ]);
            DB::table('audit_events')->insert([
                'id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null, 'target_id' => $exam->id,
                'action' => 'official_exam.question_version_updated', 'created_at' => $now,
            ]);
            $exam->touch();

            return $exam;
        });
    }
}
