<?php

namespace App\Modules\QuestionBank\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Question extends Model
{
    use HasUuids;

    public function latestVersion(): BelongsTo
    {
        return $this->belongsTo(QuestionVersion::class, 'latest_version_id');
    }

    public function publishedVersion(): BelongsTo
    {
        return $this->belongsTo(QuestionVersion::class, 'published_version_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(QuestionVersion::class);
    }
}
