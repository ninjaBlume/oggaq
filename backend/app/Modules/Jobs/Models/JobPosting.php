<?php

namespace App\Modules\Jobs\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobPosting extends Model
{
    use HasUuids;

    protected $fillable = ['title', 'company_name', 'city', 'description', 'weapon_requirement', 'status', 'expires_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'immutable_datetime', 'revision' => 'integer'];
    }

    public function applications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }

    public function scopeOpen(Builder $query): void
    {
        $query->where('status', 'published')->where(fn (Builder $q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }

    public function isOpen(): bool
    {
        return $this->status === 'published' && ($this->expires_at === null || $this->expires_at->isFuture());
    }
}
