<?php

namespace App\Modules\Exams\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'context_id' => $this->study_context_id, 'revision' => $this->revision,
            'status' => $this->finished_at === null ? 'active' : 'completed',
            'question_count' => $this->question_count, 'duration_seconds' => $this->duration_seconds,
            'subject_id' => $this->subject_id, 'topic_id' => $this->topic_id, 'scoring_rule' => $this->scoring_rule,
            'started_at' => $this->started_at->toISOString(), 'deadline_at' => $this->deadline_at->toISOString(),
            'server_time' => now()->toISOString(), 'finished_at' => $this->finished_at?->toISOString(), 'finish_reason' => $this->finish_reason,
            'result' => $this->finished_at === null ? null : [
                'correct' => $this->correct_count, 'incorrect' => $this->incorrect_count, 'blank' => $this->blank_count,
                'score_percent' => $this->score_percent,
                'elapsed_seconds' => min($this->duration_seconds, max(0, (int) $this->started_at->diffInSeconds($this->finished_at))),
            ],
        ];
    }
}
