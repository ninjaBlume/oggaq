<?php

namespace App\Modules\Exams\Models;

use App\Modules\QuestionBank\Models\QuestionVersion;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamAnswer extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected function casts(): array
    {
        return ['is_correct' => 'boolean'];
    }

    public function questionVersion(): BelongsTo
    {
        return $this->belongsTo(QuestionVersion::class);
    }
}
