<?php

namespace App\Modules\Exams\Models;

use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\Scoring\Models\ExamScoreResult;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ExamAttempt extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $with = ['officialExam', 'bookmark', 'scoreResult'];

    protected function casts(): array
    {
        return ['started_at' => 'immutable_datetime', 'deadline_at' => 'immutable_datetime', 'finished_at' => 'immutable_datetime', 'score_percent' => 'float', 'timer_policy' => 'string', 'paused_at' => 'immutable_datetime', 'clock_seen_at' => 'immutable_datetime', 'paused_seconds' => 'integer', 'random_distribution' => 'array'];
    }

    public function pauseMoment(): ?CarbonInterface
    {
        if ($this->timer_policy !== 'pause_on_exit' || $this->finished_at !== null) {
            return null;
        }
        if ($this->paused_at !== null) {
            return $this->paused_at;
        }
        $cutoff = $this->clock_seen_at?->addSeconds(30);

        return $cutoff !== null && now()->greaterThanOrEqualTo($cutoff) && $this->deadline_at->greaterThan($cutoff) ? $cutoff : null;
    }

    // A finished attempt in which no question was answered is abandoned: it is neither a result nor part of the statistics.
    public function scopeNotAbandoned(Builder $query): void
    {
        $query->where(fn (Builder $inner) => $inner->whereNull('finished_at')->orWhereRaw('correct_count + incorrect_count > 0'));
    }

    public function officialExam(): BelongsTo
    {
        return $this->belongsTo(OfficialExam::class);
    }

    public function scoreResult(): HasOne
    {
        return $this->hasOne(ExamScoreResult::class)->orderByDesc('revision');
    }

    public function bookmark(): HasOne
    {
        return $this->hasOne(ExamBookmark::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(ExamAnswer::class)->orderBy('position');
    }
}
