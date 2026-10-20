<?php

namespace App\Modules\QuestionBank;

use Illuminate\Support\Facades\DB;

// Tracking numbers for editors, computed for a whole page of exams with two queries and attached as attributes.
// draft: pinned version is not published yet (the exam cannot be published). outdated: the question has a newer
// version than the one the exam pins (a correction that has not reached this exam). used_in: exams that contain the question.
class OfficialExamHealth
{
    public const COUNTS = 'question_exam_counts';

    public static function attach(iterable $exams): void
    {
        $exams = collect($exams);
        if ($exams->isEmpty()) {
            return;
        }
        $ids = $exams->pluck('id')->all();
        $health = DB::table('official_exam_questions as eq')
            ->join('question_versions as v', 'v.id', '=', 'eq.question_version_id')
            ->join('questions as q', 'q.id', '=', 'eq.question_id')
            ->whereIn('eq.official_exam_id', $ids)->groupBy('eq.official_exam_id')
            ->selectRaw('eq.official_exam_id as id, count(*) filter (where v.published_at is null) as drafts, count(*) filter (where q.latest_version_id <> eq.question_version_id) as outdated')
            ->get()->keyBy('id');
        $questionIds = DB::table('official_exam_questions')->whereIn('official_exam_id', $ids)->pluck('question_id');
        $usedIn = $questionIds->isEmpty() ? collect() : DB::table('official_exam_questions')->whereIn('question_id', $questionIds)->groupBy('question_id')->selectRaw('question_id, count(*) as total')->pluck('total', 'question_id');
        foreach ($exams as $exam) {
            $exam->setAttribute('draft_question_count', (int) ($health[$exam->id]->drafts ?? 0));
            $exam->setAttribute('outdated_question_count', (int) ($health[$exam->id]->outdated ?? 0));
            $exam->setAttribute(self::COUNTS, $usedIn->map(fn ($total) => (int) $total)->all());
        }
    }
}
