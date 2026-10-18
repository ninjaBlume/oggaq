<?php

namespace App\Modules\Exams\Models;

use App\Modules\QuestionBank\Models\OfficialExam;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamAttempt extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $with = ['officialExam'];

    protected function casts(): array
    {
        return ['started_at' => 'immutable_datetime', 'deadline_at' => 'immutable_datetime', 'finished_at' => 'immutable_datetime', 'score_percent' => 'float'];
    }

    public function officialExam(): BelongsTo
    {
        return $this->belongsTo(OfficialExam::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(ExamAnswer::class)->orderBy('position');
    }
}
