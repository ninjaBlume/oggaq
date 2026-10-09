<?php

namespace App\Modules\QuestionBank\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class QuestionOption extends Model
{
    use HasUuids;

    public $timestamps = false;
}
