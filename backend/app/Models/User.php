<?php

namespace App\Models;

use App\Modules\Identity\Notifications\ResetPasswordNotification;
use App\Modules\Identity\Notifications\VerifyEmailNotification;
use App\Modules\Tenancy\Models\Membership;
use App\Modules\Tenancy\Models\StudyContext;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $attributes = ['platform_role' => 'student', 'status' => 'active'];

    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    public function studyContexts(): HasMany
    {
        return $this->hasMany(StudyContext::class);
    }

    public function isPlatformAdmin(): bool
    {
        return $this->platform_role === 'platform_admin' && $this->status === 'active';
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
