<?php

namespace App\Modules\QuestionBank\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Past-exam metadata only. Questions reach students through an exam attempt, never with the answer key.
class OfficialExamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'title' => $this->title, 'exam_type_id' => $this->exam_type_id,
            'year' => $this->year, 'term' => $this->term, 'exam_number' => $this->exam_number,
            'question_count' => $this->questions_count,
            'source' => $this->source === null ? null : ['id' => $this->source->id, 'title' => $this->source->title, 'url' => $this->source->url, 'citation' => $this->source->citation],
            'published_at' => $this->published_at?->toISOString(),
        ];
    }
}
