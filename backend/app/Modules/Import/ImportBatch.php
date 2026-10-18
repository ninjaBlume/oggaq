<?php

namespace App\Modules\Import;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ImportBatch extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return ['report' => 'array', 'approved_at' => 'immutable_datetime', 'committed_at' => 'immutable_datetime'];
    }
}
