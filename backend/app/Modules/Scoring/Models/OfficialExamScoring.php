<?php

namespace App\Modules\Scoring\Models;

use Illuminate\Database\Eloquent\Model;

class OfficialExamScoring extends Model
{
    protected $table = 'official_exam_scoring';

    protected $primaryKey = 'official_exam_id';

    public $timestamps = false;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];
}
