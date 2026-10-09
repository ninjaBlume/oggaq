<?php

namespace Tests;

use App\Models\User;
use App\Modules\Tenancy\Models\Membership;
use App\Modules\Tenancy\Models\StudyContext;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Cache;

abstract class TestCase extends BaseTestCase
{
    protected const PASSWORD = 'Test-Password-42!';

    public function createApplication(): Application
    {
        $app = parent::createApplication();
        if (! $app->environment('testing') || config('database.default') !== 'pgsql'
            || config('database.connections.pgsql.database') !== 'oggaq_test') {
            throw new \RuntimeException('Tests must use the isolated PostgreSQL oggaq_test database.');
        }

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    protected function createUser(array $attributes = []): User
    {
        $user = User::factory()->create(array_merge(['password' => self::PASSWORD], $attributes));
        StudyContext::create(['user_id' => $user->id]);

        return $user;
    }

    protected function createMembership(User $user, Tenant $tenant, string $role = 'student'): Membership
    {
        $membership = Membership::create([
            'user_id' => $user->id, 'tenant_id' => $tenant->id, 'role' => $role,
            'status' => 'active', 'joined_at' => now(),
        ]);
        StudyContext::create(['user_id' => $user->id, 'tenant_id' => $tenant->id, 'membership_id' => $membership->id]);

        return $membership;
    }

    protected function asToken(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('test', ['api:access'], now()->addHour())->plainTextToken);
    }
}
