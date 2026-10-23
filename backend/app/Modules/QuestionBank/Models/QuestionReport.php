<?php

namespace App\Modules\QuestionBank\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class QuestionReport extends Model
{
    use HasUuids;

    public const REASONS = ['wrong_answer_key', 'typo', 'unclear', 'outdated', 'other'];

    public const STATUSES = ['open', 'fixed', 'dismissed'];

    public $timestamps = false;

    protected $fillable = ['question_id', 'question_version_id', 'user_id', 'exam_attempt_id', 'reason', 'note', 'status', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'immutable_datetime', 'resolved_at' => 'immutable_datetime'];
    }
}
