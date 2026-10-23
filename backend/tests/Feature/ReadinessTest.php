<?php

namespace Tests\Feature;

use App\Support\Readiness;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class ReadinessTest extends TestCase
{
    use RefreshDatabase;

    private function heartbeat(int $secondsAgo = 0): void
    {
        Cache::put(Readiness::HEARTBEAT_KEY, now()->timestamp - $secondsAgo, 600);
    }

    public function test_a_healthy_instance_is_ready_without_signing_in_and_says_nothing_else(): void
    {
        $this->heartbeat();

        $response = $this->getJson('/api/v1/health/ready')->assertOk();

        $response->assertExactJson(['data' => ['status' => 'ok', 'checks' => ['database' => true, 'redis' => true, 'migrations' => true, 'queue' => true, 'scheduler' => true]]]);
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_a_stopped_scheduler_is_degraded_but_still_serving(): void
    {
        $this->getJson('/api/v1/health/ready')->assertOk()->assertJsonPath('data.status', 'degraded')->assertJsonPath('data.checks.scheduler', false)->assertJsonPath('data.checks.database', true);
        $this->heartbeat(Readiness::HEARTBEAT_MAX_AGE_SECONDS + 5);
        $this->getJson('/api/v1/health/ready')->assertOk()->assertJsonPath('data.status', 'degraded');
        $this->heartbeat(Readiness::HEARTBEAT_MAX_AGE_SECONDS - 5);
        $this->getJson('/api/v1/health/ready')->assertOk()->assertJsonPath('data.status', 'ok');
    }

    public function test_pending_migrations_make_the_instance_unavailable(): void
    {
        $this->heartbeat();
        DB::table('migrations')->orderByDesc('id')->limit(1)->delete();

        $this->getJson('/api/v1/health/ready')->assertStatus(503)->assertJsonPath('data.status', 'unavailable')->assertJsonPath('data.checks.migrations', false);
    }

    public function test_an_unreachable_redis_makes_the_instance_unavailable_without_leaking_why(): void
    {
        $this->heartbeat();
        config(['database.redis.default.port' => 1]);
        Redis::purge('default');

        $response = $this->getJson('/api/v1/health/ready')->assertStatus(503)->assertJsonPath('data.status', 'unavailable')->assertJsonPath('data.checks.redis', false);

        $this->assertStringNotContainsString('refused', $response->getContent());
        $this->assertStringNotContainsString('127.0.0.1', $response->getContent());
        Redis::purge('default');
    }

    public function test_the_endpoint_is_rate_limited_per_address(): void
    {
        $this->heartbeat();
        for ($i = 0; $i < 30; $i++) {
            $this->getJson('/api/v1/health/ready')->assertOk();
        }
        $this->getJson('/api/v1/health/ready')->assertStatus(429);
    }

    public function test_the_scheduler_heartbeat_is_scheduled_every_minute(): void
    {
        $event = collect(app(Schedule::class)->events())->first(fn ($candidate) => $candidate->description === 'scheduler-heartbeat');

        $this->assertNotNull($event);
        $this->assertSame('* * * * *', $event->expression);
    }
}
