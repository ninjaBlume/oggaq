<?php

namespace App\Modules\QuestionBank\Http\Resources;

use Illuminate\Http\Request;

class AdminOfficialExamResource extends OfficialExamResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'status' => $this->published_at === null ? 'draft' : 'published',
            'created_at' => $this->created_at->toISOString(), 'updated_at' => $this->updated_at->toISOString(),
            'questions' => $this->whenLoaded('questions', fn () => $this->questions->map(fn ($row) => [
                'position' => $row->position, 'question_id' => $row->question_id, 'published_version_id' => $row->questionVersion->question->published_version_id,
                'question_revision' => $row->questionVersion->question->revision,
                'question' => new AdminQuestionVersionResource($row->questionVersion),
                // The freshest draft is what an editor continues from; it is only sent when it differs from the pinned version.
                'latest_version' => $row->questionVersion->question->latest_version_id === $row->question_version_id ? null : new AdminQuestionVersionResource($row->questionVersion->question->latestVersion),
            ])->all()),
        ];
    }
}
