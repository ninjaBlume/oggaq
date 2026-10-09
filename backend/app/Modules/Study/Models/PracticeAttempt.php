<?php

namespace App\Modules\Study\Models;

use App\Modules\QuestionBank\Models\QuestionVersion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PracticeAttempt extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['is_correct' => 'boolean', 'created_at' => 'immutable_datetime', 'answered_at' => 'immutable_datetime'];
    }

    public function questionVersion(): BelongsTo
    {
        return $this->belongsTo(QuestionVersion::class);
    }
}
