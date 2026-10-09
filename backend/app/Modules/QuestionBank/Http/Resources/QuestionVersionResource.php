<?php

namespace App\Modules\QuestionBank\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionVersionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'version' => $this->version, 'subject_id' => $this->subject_id,
            'topic_id' => $this->topic_id, 'exam_type_id' => $this->exam_type_id,
            'stem' => $this->stem, 'published_at' => $this->published_at?->toISOString(),
            'source' => $this->source === null ? null : [
                'id' => $this->source->id, 'title' => $this->source->title,
                'url' => $this->source->url, 'citation' => $this->source->citation,
            ],
            'options' => $this->options->map(fn ($option) => [
                'id' => $option->id, 'position' => $option->position, 'text' => $option->text,
            ])->all(),
        ];
    }
}
