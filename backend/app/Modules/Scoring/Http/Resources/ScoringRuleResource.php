<?php

namespace App\Modules\Scoring\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScoringRuleResource extends JsonResource
{
    public function toArray(Request $r): array
    {
        return [
            'id' => $this->id, 'code' => $this->code, 'version' => $this->version, 'title' => $this->title, 'education_type' => $this->education_type, 'weapon_status' => $this->weapon_status,
            'effective_from' => $this->effective_from->toDateString(), 'effective_until' => $this->effective_until?->toDateString(),
            'period_from' => $this->period_from, 'period_until' => $this->period_until, 'configuration' => array_replace($this->configuration, ['minimums' => (object) $this->configuration['minimums']]), 'source_urls' => $this->source_urls, 'verification_note' => $this->verification_note,
            'published_at' => $this->published_at?->toISOString(), 'archived_at' => $this->archived_at?->toISOString()];
    }
}
