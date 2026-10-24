<?php

namespace App\Modules\Scoring\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScoringPeriodResource extends JsonResource
{
    public function toArray(Request $r): array
    {
        return ['id' => $this->id, 'education_type' => $this->education_type, 'weapon_status' => $this->weapon_status, 'number' => $this->number, 'exam_date' => $this->exam_date->toDateString(), 'source_url' => $this->source_url, 'rule' => new ScoringRuleResource($this->rule)];
    }
}
