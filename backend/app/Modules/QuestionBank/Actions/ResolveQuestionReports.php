<?php

namespace App\Modules\QuestionBank\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\Question;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class ResolveQuestionReports
{
    // Closes every open report of one question together: either it was fixed or the reports do not hold.
    // Resolved reports stay readable as history and are never reopened; a new problem is a new report.
    public function execute(User $actor, string $questionId, string $status, ?string $note): int
    {
        return DB::transaction(function () use ($actor, $questionId, $status, $note) {
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('manage', Question::class);
            Question::findOrFail($questionId);
            $closed = DB::table('question_reports')->where('question_id', $questionId)->where('status', 'open')
                ->update(['status' => $status, 'resolved_by' => $actor->id, 'resolved_at' => now(), 'resolution_note' => $note]);
            if ($closed === 0) {
                throw new ApiProblem(409, 'no_open_reports', 'Bu soru için açık bildirim yok. Listeyi yenileyin.');
            }
            DB::table('audit_events')->insert(['id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null, 'target_id' => $questionId, 'action' => 'question_reports.'.$status, 'created_at' => now()]);

            return $closed;
        });
    }
}
