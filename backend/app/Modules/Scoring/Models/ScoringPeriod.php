<?php

namespace App\Modules\Scoring\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScoringPeriod extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['exam_date' => 'immutable_date', 'number' => 'integer'];
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(ScoringRule::class, 'scoring_rule_id');
    }
}
