<?php

namespace App\Modules\Scoring\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ScoringRule extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['configuration' => 'array', 'source_urls' => 'array', 'effective_from' => 'immutable_date', 'effective_until' => 'immutable_date', 'published_at' => 'immutable_datetime', 'archived_at' => 'immutable_datetime'];
    }
}
