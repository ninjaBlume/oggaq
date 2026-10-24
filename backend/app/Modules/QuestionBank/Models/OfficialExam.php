<?php

namespace App\Modules\QuestionBank\Models;

use App\Modules\Scoring\Models\OfficialExamScoring;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class OfficialExam extends Model
{
    protected $with = ['scoringLink'];

    public function scoringLink(): HasOne
    {
        return $this->hasOne(OfficialExamScoring::class);
    }

    use HasUuids;

    protected function casts(): array
    {
        return ['published_at' => 'immutable_datetime', 'generate_unarmed' => 'boolean'];
    }

    public function examType(): BelongsTo
    {
        return $this->belongsTo(ExamType::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
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
