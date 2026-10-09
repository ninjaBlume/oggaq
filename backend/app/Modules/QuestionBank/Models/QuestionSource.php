<?php

namespace App\Modules\QuestionBank\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['title', 'url', 'citation'])]
class QuestionSource extends Model
{
    use HasUuids;
}
