<?php

namespace App\Modules\Exams\Models;

use Illuminate\Database\Eloquent\Model;

class OfflineExamImport extends Model
{
    protected $table = 'offline_exam_imports';

    protected $primaryKey = 'exam_attempt_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return ['client_started_at' => 'immutable_datetime', 'client_finished_at' => 'immutable_datetime', 'received_at' => 'immutable_datetime', 'client_elapsed_seconds' => 'integer'];
    }
}
