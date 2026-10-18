<?php

namespace App\Modules\QuestionBank\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\Question;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PublishOfficialExam
{
    // Idempotent: publishing an already published exam returns it unchanged.
    public function execute(User $actor, OfficialExam $exam): OfficialExam
    {
        return DB::transaction(function () use ($actor, $exam) {
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('manage', Question::class);
            $exam = OfficialExam::whereKey($exam->id)->lockForUpdate()->firstOrFail();
            if ($exam->published_at === null) {
                $count = DB::table('official_exam_questions')->where('official_exam_id', $exam->id)->count();
                if ($count < 1 || $count > 100) {
                    throw ValidationException::withMessages(['question_version_ids' => ['Yayımlamak için 1–100 soru gerekir.']]);
                }
                $exam->published_at = now();
                $exam->save();
                DB::table('audit_events')->insert([
                    'id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null,
                    'target_id' => $exam->id, 'action' => 'official_exam.published', 'created_at' => now(),
                ]);
            }

            return $exam->loadCount('questions')->load('source');
        });
    }
}
