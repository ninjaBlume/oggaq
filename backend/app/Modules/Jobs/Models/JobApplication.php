<?php

namespace App\Modules\Jobs\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    use HasUuids;

    protected $fillable = ['contact_name', 'contact_email', 'phone', 'cover_letter'];

    protected function casts(): array
    {
        return ['job_snapshot' => 'array', 'contact_name' => 'encrypted', 'contact_email' => 'encrypted', 'phone' => 'encrypted', 'cover_letter' => 'encrypted', 'revision' => 'integer'];
    }
}
