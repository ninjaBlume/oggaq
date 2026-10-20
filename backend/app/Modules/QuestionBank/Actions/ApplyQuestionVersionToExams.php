<?php

namespace App\Modules\QuestionBank\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionVersion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

// A corrected question is usually used by several exams (the armed and unarmed variant share their general questions).
// This moves every exam that still pins an older version to the given published version; exams already at or beyond it are left alone.
class ApplyQuestionVersionToExams
{
    public function __construct(private UpdateOfficialExamQuestion $update) {}

    /** @return list<array{id: string, title: string, status: string}> exams that were changed */
    public function execute(User $actor, Question $question, string $versionId): array
    {
        return DB::transaction(function () use ($actor, $question, $versionId) {
            Gate::forUser($actor)->authorize('manage', Question::class);
            $version = QuestionVersion::whereKey($versionId)->where('question_id', $question->id)->first();
            if ($version === null || $version->published_at === null) {
                throw ValidationException::withMessages(['question_version_id' => ['Sınavlara yalnız bu sorunun yayımlanmış sürümü uygulanır.']]);
            }
            $changed = [];
            $rows = DB::table('official_exam_questions as eq')->join('official_exams as e', 'e.id', '=', 'eq.official_exam_id')
                ->where('eq.question_id', $question->id)->where('eq.question_version_id', '<>', $version->id)->orderBy('e.year')->orderBy('e.id')
                ->get(['eq.official_exam_id', 'eq.question_version_id']);
            foreach ($rows as $row) {
                if (QuestionVersion::findOrFail($row->question_version_id)->version >= $version->version) {
                    continue;
                }
                $exam = $this->update->execute($actor, OfficialExam::findOrFail($row->official_exam_id), $question->id, $version->id);
                $changed[] = ['id' => $exam->id, 'title' => $exam->title, 'status' => $exam->published_at === null ? 'draft' : 'published'];
            }

            return $changed;
        });
    }
}
