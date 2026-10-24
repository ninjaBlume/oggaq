<?php

namespace App\Modules\Scoring\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScoreResultResource extends JsonResource
{
    public function toArray(Request $r): array
    {
        return ['id' => $this->id, 'exam_attempt_id' => $this->exam_attempt_id, 'revision' => $this->revision, 'period_id' => $this->scoring_period_id, 'input' => $this->input, 'output' => $this->output, 'created_at' => $this->created_at->toISOString()];
    }
}
