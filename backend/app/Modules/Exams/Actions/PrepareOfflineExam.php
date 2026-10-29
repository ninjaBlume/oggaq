<?php

namespace App\Modules\Exams\Actions;

use App\Models\User;
use App\Modules\Exams\OfflinePackageSignature;
use App\Modules\QuestionBank\Http\Resources\OfficialExamResource;
use App\Modules\QuestionBank\Http\Resources\QuestionVersionResource;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\Study\Actions\ResolveStudyContext;
use App\Support\ApiProblem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrepareOfflineExam
{
    public function execute(User $actor, string $contextId, string $examId, Request $request): array
    {
        return DB::transaction(function () use ($actor, $contextId, $examId, $request) {
            $context = app(ResolveStudyContext::class)->execute($actor, $contextId);
            if ($context->tenant_id !== null || $context->membership_id !== null) {
                throw new ApiProblem(403, 'offline_personal_only', 'Çevrimdışı sınavlar yalnız kişisel kullanım için hazırlanabilir.');
            }
            $exam = OfficialExam::with(['source', 'examType', 'subject', 'questions.questionVersion.options', 'questions.questionVersion.source'])
                ->withCount('questions')->whereNotNull('published_at')->findOrFail($examId);
            if ($exam->questions->isEmpty()) {
                throw new ApiProblem(409, 'offline_exam_empty', 'Bu sınavda indirilecek yayımlanmış soru yok.');
            }
            $exam->questions_count = $exam->questions->count();
            $questions = $exam->questions->map(function ($row) use ($request) {
                $version = $row->questionVersion;
                if ($version === null || $version->published_at === null || ! $version->options->contains('id', $version->correct_option_id)) {
                    throw new ApiProblem(409, 'offline_exam_invalid', 'Sınavın soru içeriği çevrimdışı kullanım için hazır değil.');
                }

                return ['question_id' => $row->question_id, 'position' => $row->position,
                    'question' => (new QuestionVersionResource($version))->resolve($request),
                    'correct_option_id' => $version->correct_option_id, 'explanation' => $version->explanation];
            })->all();
            $examData = (new OfficialExamResource($exam))->resolve($request);
            $content = json_encode(['exam' => $examData, 'questions' => $questions], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            $periodId = $exam->scoringLink?->scoring_period_id;
            $ruleId = $periodId ? DB::table('scoring_periods')->where('id', $periodId)->value('scoring_rule_id') : null;
            $claim = ['version' => 1, 'user_id' => $actor->id, 'context_id' => $context->id, 'official_exam_id' => $exam->id, 'content_hash' => hash('sha256', $content), 'scoring_period_id' => $periodId, 'scoring_rule_id' => $ruleId,
                'questions' => array_map(fn ($row) => ['question_id' => $row['question_id'], 'question_version_id' => $row['question']['id'], 'position' => $row['position']], $questions)];
            $signed = app(OfflinePackageSignature::class)->sign($claim);

            return ['data' => ['package_id' => $signed['package_id'], 'claim' => $claim,
                'signature' => $signed['signature'],
                'content_json' => $content, 'exam' => $examData, 'questions' => $questions]];
        });
    }
}
