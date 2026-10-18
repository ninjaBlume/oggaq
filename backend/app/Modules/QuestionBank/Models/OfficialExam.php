<?php

namespace App\Modules\QuestionBank\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OfficialExam extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return ['published_at' => 'immutable_datetime'];
    }

    public function source(): BelongsTo
    {
        return $this->belongsTo(QuestionSource::class, 'source_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(OfficialExamQuestion::class)->orderBy('position');
    }
}
