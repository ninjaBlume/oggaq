<?php

namespace App\Modules\QuestionBank\Http\Resources;

use App\Modules\QuestionBank\OfficialExamHealth;
use Illuminate\Http\Request;

class AdminOfficialExamResource extends OfficialExamResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'status' => $this->published_at === null ? 'draft' : 'published',
            'scoring_period_id' => $this->scoringLink?->scoring_period_id,
            'generate_unarmed' => $this->generate_unarmed, 'derived_from_id' => $this->derived_from_id,
            'draft_question_count' => $this->draft_question_count ?? 0, 'outdated_question_count' => $this->outdated_question_count ?? 0,
            'created_at' => $this->created_at->toISOString(), 'updated_at' => $this->updated_at->toISOString(),
            'questions' => $this->whenLoaded('questions', fn () => $this->questions->map(fn ($row) => [
                'position' => $row->position, 'question_id' => $row->question_id, 'published_version_id' => $row->questionVersion->question->published_version_id,
                'question_revision' => $row->questionVersion->question->revision,
                'exam_count' => $this->{OfficialExamHealth::COUNTS}[$row->question_id] ?? 1,
                'question' => new AdminQuestionVersionResource($row->questionVersion),
                // The freshest draft is what an editor continues from; it is only sent when it differs from the pinned version.
                'latest_version' => $row->questionVersion->question->latest_version_id === $row->question_version_id ? null : new AdminQuestionVersionResource($row->questionVersion->question->latestVersion),
            ])->all()),
        ];
    }
}
