<?php

namespace App\Modules\Scoring\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamScoreResult extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['input' => 'array', 'output' => 'array', 'revision' => 'integer', 'created_at' => 'immutable_datetime'];
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(ScoringRule::class, 'scoring_rule_id');
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(ScoringPeriod::class, 'scoring_period_id');
    }
}
