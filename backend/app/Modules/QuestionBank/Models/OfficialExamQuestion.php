<?php

namespace App\Modules\QuestionBank\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Read-only view of a template row; writes go through SaveOfficialExam because the key is composite.
class OfficialExamQuestion extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    public function questionVersion(): BelongsTo
    {
        return $this->belongsTo(QuestionVersion::class);
    }
}
