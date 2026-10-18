<?php

namespace App\Modules\Study\Models;

use App\Modules\QuestionBank\Models\QuestionVersion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class PracticeAttempt extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['is_correct' => 'boolean', 'created_at' => 'immutable_datetime', 'answered_at' => 'immutable_datetime'];
    }

    // List and show queries select the favorite flag with the row; single created/answered models fall back to one lookup.
    public function scopeWithFavorite(Builder $query): void
    {
        $query->addSelect(['practice_attempts.*', 'is_favorite' => DB::table('favorite_questions as f')->selectRaw('true')
            ->whereColumn('f.study_context_id', 'practice_attempts.study_context_id')->whereColumn('f.question_id', 'practice_attempts.question_id')->limit(1)]);
    }

    public function isFavorite(): bool
    {
        return (bool) ($this->attributes['is_favorite'] ?? DB::table('favorite_questions')->where('study_context_id', $this->study_context_id)->where('question_id', $this->question_id)->exists());
    }

    public function questionVersion(): BelongsTo
    {
        return $this->belongsTo(QuestionVersion::class);
    }
}
