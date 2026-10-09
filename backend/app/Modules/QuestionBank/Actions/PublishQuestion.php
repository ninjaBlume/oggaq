<?php

namespace App\Modules\QuestionBank\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Models\Question;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PublishQuestion
{
    public function execute(User $actor, Question $question, int $baseVersion): Question
    {
        return DB::transaction(function () use ($actor, $question, $baseVersion) {
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('manage', Question::class);
            $question = Question::whereKey($question->id)->lockForUpdate()->firstOrFail();
            if ($question->revision !== $baseVersion) {
                throw new ApiProblem(409, 'version_conflict', 'Soru başka bir işlemde güncellendi. Güncel sürümü yeniden yükleyin.');
            }
            if ($question->published_version_id === $question->latest_version_id) {
                return $question->load('latestVersion.options', 'latestVersion.source');
            }
            $version = $question->latestVersion()->lockForUpdate()->firstOrFail();
            $errors = [];
            if ($version->options()->count() < 2) {
                $errors['options'] = ['Yayımlamak için en az iki seçenek gerekir.'];
            }
            if ($version->correct_option_id === null) {
                $errors['correct_option_position'] = ['Yayımlamak için tek bir doğru cevap seçilmelidir.'];
            }
            if ($version->source_id === null) {
                $errors['source_id'] = ['Yayımlamak için kaynak belirtilmelidir.'];
            }
            if ($errors !== []) {
                throw ValidationException::withMessages($errors);
            }
            $version->published_at = now();
            $version->save();
            $question->published_version_id = $version->id;
            $question->revision++;
            $question->save();
            DB::table('audit_events')->insert([
                'id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null,
                'target_id' => $question->id, 'action' => 'question.published', 'created_at' => now(),
            ]);

            return $question->load('latestVersion.options', 'latestVersion.source');
        });
    }
}
