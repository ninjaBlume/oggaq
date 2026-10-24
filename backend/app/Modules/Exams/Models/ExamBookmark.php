<?php

namespace App\Modules\Exams\Models;

use Illuminate\Database\Eloquent\Model;

class ExamBookmark extends Model
{
    protected $primaryKey = 'exam_attempt_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['position' => 'integer'];
    }
}
