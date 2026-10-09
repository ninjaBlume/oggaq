<?php

namespace App\Modules\QuestionBank\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'code'])]
class Subject extends Model
{
    use HasUuids;
}
