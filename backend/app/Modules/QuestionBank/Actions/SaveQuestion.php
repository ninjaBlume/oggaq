<?php

namespace App\Modules\QuestionBank\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionOption;
use App\Modules\QuestionBank\Models\QuestionVersion;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class SaveQuestion
{
    public function execute(User $actor, array $attributes, ?Question $question = null): Question
    {
        return DB::transaction(function () use ($actor, $attributes, $question) {
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('manage', Question::class);
            $creating = $question === null;
            if ($creating) {
                $question = new Question;
                $question->forceFill(['created_by' => $actor->id, 'revision' => 1])->save();
                $number = 1;
            } else {
                $question = Question::whereKey($question->id)->lockForUpdate()->firstOrFail();
                if ($question->revision !== (int) $attributes['base_version']) {
                    throw new ApiProblem(409, 'version_conflict', 'Soru başka bir işlemde güncellendi. Güncel sürümü yeniden yükleyin.');
                }
                $number = $question->latestVersion()->value('version') + 1;
                $question->revision++;
            }
            $version = new QuestionVersion;
            $version->forceFill([
                'question_id' => $question->id, 'version' => $number,
                'subject_id' => $attributes['subject_id'], 'topic_id' => $attributes['topic_id'] ?? null,
                'exam_type_id' => $attributes['exam_type_id'] ?? null, 'source_id' => $attributes['source_id'] ?? null,
                'stem' => $attributes['stem'], 'explanation' => $attributes['explanation'] ?? null,
            ])->save();
            foreach ($attributes['options'] as $index => $text) {
                $option = new QuestionOption;
                $option->forceFill(['question_version_id' => $version->id, 'position' => $index + 1, 'text' => $text])->save();
                if (($attributes['correct_option_position'] ?? null) !== null && (int) $attributes['correct_option_position'] === $index + 1) {
                    $version->correct_option_id = $option->id;
                }
            }
            $version->save();
            $question->latest_version_id = $version->id;
            $question->save();
            DB::table('audit_events')->insert([
                'id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null,
                'target_id' => $question->id, 'action' => $creating ? 'question.created' : 'question.revised', 'created_at' => now(),
            ]);

            return $question->load('latestVersion.options', 'latestVersion.source');
        });
    }
}
