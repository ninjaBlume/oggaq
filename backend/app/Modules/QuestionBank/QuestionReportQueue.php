<?php

namespace App\Modules\QuestionBank;

use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// The review queue of question reports, grouped by question: one entry per question with how many students reported it,
// why, what they wrote and where the question is used. It never names the reporter.
class QuestionReportQueue
{
    public const NOTES_PER_QUESTION = 5;

    public static function page(string $status, int $perPage): CursorPaginator
    {
        $grouped = DB::table('question_reports')->where('status', $status)->groupBy('question_id')
            ->selectRaw('question_id, count(*) as report_count, min(created_at) as first_reported_at, max(created_at) as last_reported_at');
        $page = DB::query()->fromSub($grouped, 'g')->orderByDesc('last_reported_at')->orderBy('question_id')->cursorPaginate($perPage)->withQueryString();
        $page->setCollection(self::present($page->getCollection(), $status));

        return $page;
    }

    /** @return array{open_questions: int, open_reports: int} */
    public static function summary(): array
    {
        $row = DB::table('question_reports')->where('status', 'open')->selectRaw('count(distinct question_id) as questions, count(*) as reports')->first();

        return ['open_questions' => (int) $row->questions, 'open_reports' => (int) $row->reports];
    }

    private static function present(Collection $groups, string $status): Collection
    {
        $ids = $groups->pluck('question_id')->all();
        if ($ids === []) {
            return collect();
        }
        $marks = implode(',', array_fill(0, count($ids), '?'));
        $questions = DB::table('questions as q')->join('question_versions as v', 'v.id', '=', 'q.latest_version_id')->leftJoin('subjects as s', 's.id', '=', 'v.subject_id')
            ->whereIn('q.id', $ids)->get(['q.id', 'v.stem', 'v.version', 's.id as subject_id', 's.name as subject_name'])->keyBy('id');
        $reasons = DB::table('question_reports')->where('status', $status)->whereIn('question_id', $ids)->groupBy('question_id', 'reason')
            ->selectRaw('question_id, reason, count(*) as total')->get()->groupBy('question_id');
        // The newest few written notes per question (reason and text only).
        $notes = collect(DB::select(
            "SELECT question_id, reason, note, created_at FROM (SELECT question_id, reason, note, created_at, row_number() OVER (PARTITION BY question_id ORDER BY created_at DESC, id DESC) AS position FROM question_reports WHERE status = ? AND note IS NOT NULL AND question_id IN ($marks)) ranked WHERE position <= ".self::NOTES_PER_QUESTION.' ORDER BY created_at DESC',
            [$status, ...$ids],
        ))->groupBy('question_id');
        // The version the most recent report was written against, and how the queue entry was closed.
        $latest = collect(DB::select(
            "SELECT DISTINCT ON (r.question_id) r.question_id, v.version AS reported_version, r.resolution_note, r.resolved_at FROM question_reports r JOIN question_versions v ON v.id = r.question_version_id WHERE r.status = ? AND r.question_id IN ($marks) ORDER BY r.question_id, r.created_at DESC, r.id DESC",
            [$status, ...$ids],
        ))->keyBy('question_id');
        $exams = QuestionExamMemberships::for($ids, publishedOnly: false);

        return $groups->map(function ($group) use ($questions, $reasons, $notes, $latest, $exams, $status) {
            $question = $questions[$group->question_id];

            return [
                'question_id' => $group->question_id,
                'stem_excerpt' => mb_strimwidth(trim(preg_replace('/\s+/u', ' ', $question->stem)), 0, 180, '…'),
                'subject' => $question->subject_id === null ? null : ['id' => $question->subject_id, 'name' => $question->subject_name],
                'report_count' => (int) $group->report_count,
                'reasons' => $reasons[$group->question_id]->mapWithKeys(fn ($row) => [$row->reason => (int) $row->total])->all(),
                'notes' => ($notes[$group->question_id] ?? collect())->map(fn ($row) => ['reason' => $row->reason, 'note' => $row->note, 'created_at' => Carbon::parse($row->created_at)->toISOString()])->values()->all(),
                'first_reported_at' => Carbon::parse($group->first_reported_at)->toISOString(),
                'last_reported_at' => Carbon::parse($group->last_reported_at)->toISOString(),
                'reported_version' => (int) $latest[$group->question_id]->reported_version,
                'current_version' => (int) $question->version,
                'exams' => array_map(fn ($exam) => ['id' => $exam['id'], 'title' => $exam['title'], 'exam_number' => $exam['exam_number'], 'exam_type_name' => $exam['exam_type_name'], 'subject_name' => $exam['subject_name'], 'weapon_status' => $exam['weapon_status'], 'position' => $exam['position'], 'status' => $exam['status']], $exams[$group->question_id] ?? []),
                'resolution' => $status === 'open' ? null : ['status' => $status, 'note' => $latest[$group->question_id]->resolution_note, 'resolved_at' => Carbon::parse($latest[$group->question_id]->resolved_at)->toISOString()],
            ];
        })->values();
    }
}
