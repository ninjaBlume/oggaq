<?php

namespace App\Modules\Exams\Http\Resources;

use App\Modules\Scoring\Http\Resources\ScoreResultResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $now = now()->startOfSecond();
        $pause = $this->resource->pauseMoment();
        $offline = $this->resource->relationLoaded('offlineImport') ? $this->resource->offlineImport : null;
        $remaining = $this->finished_at !== null ? 0 : max(0, (int) ceil(($pause ?? $now)->diffInSeconds($this->deadline_at, false)));

        return [
            'id' => $this->id, 'context_id' => $this->study_context_id, 'revision' => $this->revision,
            'status' => $this->finished_at === null ? 'active' : 'completed',
            'resume_position' => $this->bookmark?->position,
            'timer_policy' => $this->timer_policy ?? 'continuous', 'timer_paused' => $pause !== null, 'remaining_seconds' => $remaining,
            'question_count' => $this->question_count, 'duration_seconds' => $this->duration_seconds,
            'review_kind' => $this->resource->getRawOriginal('review_kind'),
            'random_exam' => $this->resource->getRawOriginal('random_weapon_status') === null ? null : [
                'education_type' => $this->random_education_type, 'weapon_status' => $this->random_weapon_status,
                'title' => 'Rastgele sınav · '.($this->random_education_type === 'renewal' ? 'Yenileme' : 'Temel eğitim').' · '.[
                    'armed' => 'Silahlı', 'unarmed' => 'Silahsız', 'weapon_difference' => 'Silah farkı',
                ][$this->random_weapon_status],
                'reference_exam_id' => $this->random_reference_exam_id, 'distribution' => $this->random_distribution,
            ],
            'subject_id' => $this->subject_id, 'topic_id' => $this->topic_id, 'scoring_rule' => $this->scoring_rule,
            'official_exam' => $this->officialExam === null ? null : [
                'id' => $this->officialExam->id, 'title' => $this->officialExam->title, 'year' => $this->officialExam->year,
                'term' => $this->officialExam->term, 'exam_number' => $this->officialExam->exam_number,
            ],
            'started_at' => ($offline?->client_started_at ?? $this->started_at)->toISOString(), 'deadline_at' => ($pause === null ? $this->deadline_at : $now->copy()->addSeconds($remaining))->toISOString(),
            'server_time' => now()->toISOString(), 'finished_at' => ($offline?->client_finished_at ?? $this->finished_at)?->toISOString(), 'finish_reason' => $this->finish_reason,
            'offline_import' => $offline === null ? null : ['received_at' => $offline->received_at->toISOString(), 'device_time_unverified' => true],
            'scoring_available' => $this->resource->getRawOriginal('random_scoring_period_id') !== null || $this->officialExam?->scoringLink !== null,
            'score_result' => $this->finished_at === null || $this->scoreResult?->output === null ? null : new ScoreResultResource($this->scoreResult),
            'result' => $this->finished_at === null ? null : [
                'correct' => $this->correct_count, 'incorrect' => $this->incorrect_count, 'blank' => $this->blank_count,
                'score_percent' => $this->score_percent,
                'elapsed_seconds' => $offline?->client_elapsed_seconds ?? min($this->duration_seconds, max(0, (int) $this->started_at->diffInSeconds($this->finished_at) - (int) $this->paused_seconds)),
            ],
        ];
    }
}
