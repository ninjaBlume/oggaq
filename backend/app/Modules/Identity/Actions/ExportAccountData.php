<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Jobs\Models\JobApplication;
use Closure;
use Generator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Writes the actor's own data as one JSON document, piece by piece, so even a long history never sits in memory at once.
// Everything is reached through the user's own study contexts: other members' data cannot enter the file.
class ExportAccountData
{
    private const CHUNK = 25;

    public function __construct(private UserSessions $sessions) {}

    public function filename(): string
    {
        return 'oggaq-verilerim-'.now()->format('Ymd').'.json';
    }

    public function write(User $user, Request $request, Closure $out): void
    {
        $contexts = DB::table('study_contexts as c')->leftJoin('tenants as t', 't.id', '=', 'c.tenant_id')->where('c.user_id', $user->id)
            ->orderBy('c.created_at')->get(['c.id', 'c.tenant_id', 't.name as tenant_name', 'c.created_at'])->all();
        $contextIds = array_column($contexts, 'id');
        $out("{\n".$this->entry('exported_at', now()->toISOString()).",\n");
        $out($this->entry('profile', [
            'id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'pending_email' => $user->pending_email,
            'email_verified_at' => $user->email_verified_at?->toISOString(), 'platform_role' => $user->platform_role,
            'created_at' => $user->created_at?->toISOString(),
        ]).",\n");
        $this->section($out, 'memberships', DB::table('memberships as m')->join('tenants as t', 't.id', '=', 'm.tenant_id')->where('m.user_id', $user->id)
            ->orderBy('m.joined_at')->get(['t.name as tenant', 'm.role', 'm.status', 'm.joined_at', 'm.revoked_at'])->map(fn ($row) => (array) $row)->all());
        $this->section($out, 'study_contexts', array_map(fn ($context) => [
            'id' => $context->id, 'kind' => $context->tenant_id === null ? 'personal' : 'tenant', 'tenant' => $context->tenant_name, 'created_at' => $context->created_at,
        ], $contexts));
        $this->section($out, 'job_applications', JobApplication::where('user_id', $user->id)->orderBy('id')->lazyById(self::CHUNK)->map(fn ($application) => [
            'job' => $application->job_snapshot, 'contact_name' => $application->contact_name, 'contact_email' => $application->contact_email,
            'phone' => $application->phone, 'cover_letter' => $application->cover_letter, 'status' => $application->status, 'created_at' => $application->created_at->toISOString(),
        ]));
        $this->section($out, 'exam_attempts', $this->examAttempts($contextIds));
        $this->section($out, 'practice_attempts', $this->practiceAttempts($contextIds));
        $this->section($out, 'favorites', DB::table('favorite_questions as f')->whereIn('f.study_context_id', $contextIds)->orderBy('f.created_at')
            ->selectRaw('f.study_context_id as context_id, f.created_at, (select v.stem from question_versions v where v.question_id = f.question_id order by v.version desc limit 1) as question')
            ->get()->map(fn ($row) => (array) $row)->all());
        $this->section($out, 'question_reports', DB::table('question_reports as r')->join('question_versions as v', 'v.id', '=', 'r.question_version_id')
            ->where('r.user_id', $user->id)->orderBy('r.created_at')
            ->get(['v.stem as question', 'r.reason', 'r.note', 'r.status', 'r.created_at', 'r.resolved_at'])->map(fn ($row) => (array) $row)->all());
        $this->section($out, 'sessions', array_map(fn ($session) => array_diff_key($session, ['id' => 1]), $this->sessions->list($user, $request)), last: true);
        $out("}\n");
    }

    private function examAttempts(array $contextIds): Generator
    {
        $attempts = DB::table('exam_attempts as a')->leftJoin('official_exams as e', 'e.id', '=', 'a.official_exam_id')->leftJoin('exam_bookmarks as b', 'b.exam_attempt_id', '=', 'a.id')->whereIn('a.study_context_id', $contextIds)
            ->select('a.id', 'a.study_context_id', 'b.position as resume_position', 'e.title as exam', 'a.started_at', 'a.deadline_at', 'a.finished_at', 'a.finish_reason', 'a.duration_seconds',
                'a.question_count', 'a.correct_count', 'a.incorrect_count', 'a.blank_count', 'a.score_percent');
        foreach ($attempts->lazyById(self::CHUNK, 'a.id', 'id')->chunk(self::CHUNK) as $chunk) {
            $answers = DB::table('exam_answers as x')->join('question_versions as v', 'v.id', '=', 'x.question_version_id')
                ->whereIn('x.exam_attempt_id', $chunk->pluck('id')->all())->orderBy('x.exam_attempt_id')->orderBy('x.position')
                ->get(['x.exam_attempt_id', 'x.position', 'x.question_version_id', 'x.selected_option_id', 'x.is_correct', 'v.stem', 'v.correct_option_id']);
            $options = DB::table('question_options')->whereIn('question_version_id', $answers->pluck('question_version_id')->unique()->all())->orderBy('position')
                ->get(['id', 'question_version_id', 'position', 'text'])->groupBy('question_version_id');
            $byAttempt = $answers->groupBy('exam_attempt_id');
            foreach ($chunk as $attempt) {
                $finished = $attempt->finished_at !== null;
                yield [
                    'context_id' => $attempt->study_context_id, 'exam' => $attempt->exam, 'started_at' => $attempt->started_at, 'deadline_at' => $attempt->deadline_at,
                    'finished_at' => $attempt->finished_at, 'finish_reason' => $attempt->finish_reason, 'duration_seconds' => $attempt->duration_seconds,
                    'question_count' => $attempt->question_count, 'resume_position' => $attempt->resume_position, 'correct' => $attempt->correct_count, 'incorrect' => $attempt->incorrect_count,
                    'blank' => $attempt->blank_count, 'score_percent' => $attempt->score_percent === null ? null : (float) $attempt->score_percent,
                    'answers' => ($byAttempt[$attempt->id] ?? collect())->map(fn ($answer) => [
                        'position' => $answer->position, 'question' => $answer->stem,
                        // The answer key of an attempt that is still running stays out of the file.
                        'outcome' => ! $finished ? null : ($answer->selected_option_id === null ? 'blank' : ($answer->is_correct ? 'correct' : 'incorrect')),
                        'options' => ($options[$answer->question_version_id] ?? collect())->map(fn ($option) => array_filter([
                            'position' => $option->position, 'text' => $option->text, 'selected' => $option->id === $answer->selected_option_id,
                            'correct' => $finished ? $option->id === $answer->correct_option_id : null,
                        ], fn ($value) => $value !== null))->all(),
                    ])->all(),
                ];
            }
        }
    }

    private function practiceAttempts(array $contextIds): Generator
    {
        $attempts = DB::table('practice_attempts as p')->join('question_versions as v', 'v.id', '=', 'p.question_version_id')->whereIn('p.study_context_id', $contextIds)
            ->select('p.id', 'p.study_context_id', 'p.created_at', 'p.answered_at', 'p.is_correct', 'p.selected_option_id', 'v.stem');
        foreach ($attempts->lazyById(self::CHUNK * 4, 'p.id', 'id') as $attempt) {
            yield [
                'context_id' => $attempt->study_context_id, 'question' => $attempt->stem, 'started_at' => $attempt->created_at, 'answered_at' => $attempt->answered_at,
                'outcome' => $attempt->answered_at === null ? null : ($attempt->selected_option_id === null ? 'blank' : ($attempt->is_correct ? 'correct' : 'incorrect')),
            ];
        }
    }

    private function section(Closure $out, string $name, iterable $rows, bool $last = false): void
    {
        $out('"'.$name.'": [');
        $first = true;
        foreach ($rows as $row) {
            $out(($first ? "\n" : ",\n").'  '.$this->encode($row));
            $first = false;
        }
        $out(($first ? '' : "\n").']'.($last ? '' : ',')."\n");
    }

    private function entry(string $name, mixed $value): string
    {
        return '"'.$name.'": '.$this->encode($value);
    }

    private function encode(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION);
    }
}
