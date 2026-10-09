<?php

namespace App\Modules\Tenancy\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug'])]
class Tenant extends Model
{
    use HasUuids;

    protected $attributes = ['status' => 'active'];

    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }
}
