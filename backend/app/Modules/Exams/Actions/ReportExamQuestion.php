<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\QuestionReport;
use App\Support\ApiProblem;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReportExamQuestion
{
    public function __construct(private AccessExam $exams) {}

    // A student reports a question from the result of a finished attempt of their own, never while the timer runs.
    // Idempotent per student and question: while a report is open, repeating it returns that report.
    /** @return array{0: QuestionReport, 1: bool} the report and whether it was created now */
    public function execute(User $actor, string $contextId, string $examId, string $answerId, array $input): array
    {
        $attempt = $this->exams->execute($actor, $contextId, $examId);
        if ($attempt->finished_at === null) {
            throw new ApiProblem(409, 'attempt_active', 'Soruyu sınav bittikten sonra bildirebilirsin.');
        }
        $answer = $attempt->answers->firstWhere('id', $answerId) ?? abort(404);

        try {
            return DB::transaction(function () use ($actor, $attempt, $answer, $input) {
                $open = QuestionReport::where('user_id', $actor->id)->where('question_id', $answer->question_id)->where('status', 'open')->lockForUpdate()->first();
                if ($open !== null) {
                    return [$open, false];
                }
                $report = QuestionReport::create([
                    'question_id' => $answer->question_id, 'question_version_id' => $answer->question_version_id, 'user_id' => $actor->id,
                    'exam_attempt_id' => $attempt->id, 'reason' => $input['reason'], 'note' => $input['note'] ?? null, 'status' => 'open', 'created_at' => now(),
                ]);
                // The audit trail names the report, never its text.
                DB::table('audit_events')->insert(['id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null, 'target_id' => $report->id, 'action' => 'question.reported', 'created_at' => now()]);

                return [$report, true];
            });
        } catch (QueryException $exception) {
            // Two requests raced past the check; the unique index let one through, the other reads it.
            if ($exception->getCode() !== '23505') {
                throw $exception;
            }
            $open = QuestionReport::where('user_id', $actor->id)->where('question_id', $answer->question_id)->where('status', 'open')->firstOrFail();

            return [$open, false];
        }
    }
}
