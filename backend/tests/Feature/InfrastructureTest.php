<?php

namespace Tests\Feature;

use App\Modules\Identity\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\TestCase;

class InfrastructureTest extends TestCase
{
    use RefreshDatabase;

    public function test_real_redis_connection_can_store_and_remove_a_test_key(): void
    {
        $key = 'test:'.Str::uuid();
        $redis = Redis::connection();
        try {
            $redis->setex($key, 30, 'synthetic');
            $this->assertEquals('synthetic', $redis->get($key));
        } finally {
            $redis->del($key);
        }
    }

    public function test_reset_token_is_encrypted_in_queue_payload(): void
    {
        $user = $this->createUser();
        $job = new SendQueuedNotifications($user, new ResetPasswordNotification('sensitive-reset-token'));
        $queueName = 'test-encryption-'.Str::uuid();
        $queue = Queue::connection('redis');
        try {
            $queue->push($job->beforeCommit(), '', $queueName);
            $payload = Redis::connection()->lindex('queues:'.$queueName, 0);
            $this->assertStringNotContainsString('sensitive-reset-token', $payload);
            $data = json_decode($payload, true, flags: JSON_THROW_ON_ERROR);
            $this->assertStringContainsString('sensitive-reset-token', Crypt::decryptString($data['data']['command']));
        } finally {
            $queue->clear($queueName);
        }
    }

    public function test_horizon_is_not_public_even_in_local_environment(): void
    {
        $this->app['env'] = 'local';
        $this->get('/horizon')->assertForbidden();
        $this->actingAs($this->createUser())->get('/horizon')->assertForbidden();
        $this->flushSession();
        $this->actingAs($this->createUser(['platform_role' => 'platform_admin', 'email_verified_at' => null]))
            ->get('/horizon')->assertForbidden();
        $this->flushSession();
        $this->actingAs($this->createUser(['platform_role' => 'platform_admin']))->get('/horizon')->assertOk();
    }

    public function test_horizon_rejects_a_stale_password_session(): void
    {
        $user = $this->createUser(['platform_role' => 'platform_admin']);
        $this->actingAs($user)->withSession(['password_hash_web' => 'stale-password-stamp'])
            ->get('/horizon')->assertRedirect(config('security.frontend_url').'/login');
        $this->assertGuest('web');
    }

    public function test_internal_errors_hide_exception_and_debug_details(): void
    {
        config(['app.debug' => true]);
        Route::get('/api/v1/internal-error-test', fn () => throw new \RuntimeException('private-internal-detail'));
        $response = $this->getJson('/api/v1/internal-error-test')->assertStatus(500)->assertHeader('Content-Type', 'application/problem+json');
        $this->assertStringNotContainsString('private-internal-detail', $response->getContent());
        $response->assertJsonMissingPath('trace')->assertJsonMissingPath('exception')->assertJsonStructure(['request_id']);
    }

    public function test_cors_is_limited_to_known_frontends(): void
    {
        $this->withHeaders(['Origin' => 'https://untrusted.example', 'Access-Control-Request-Method' => 'POST'])
            ->options('/api/v1/auth/register')->assertHeaderMissing('Access-Control-Allow-Origin');
        $this->withHeaders(['Origin' => 'http://127.0.0.1:5173', 'Access-Control-Request-Method' => 'POST'])
            ->options('/api/v1/auth/register')->assertHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5173');
    }

    public function test_openapi_covers_exactly_the_implemented_business_routes(): void
    {
        $spec = json_decode(file_get_contents(base_path('../docs/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
        $documented = [];
        foreach ($spec['paths'] as $path => $operations) {
            if (! str_starts_with($path, '/api/v1/')) {
                continue;
            }
            foreach (array_keys($operations) as $method) {
                $documented[] = strtoupper($method).' '.$path;
            }
        }
        $implemented = [];
        foreach (Route::getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/v1/')) {
                continue;
            }
            foreach (array_diff($route->methods(), ['HEAD']) as $method) {
                $implemented[] = $method.' /'.$route->uri();
            }
        }
        sort($implemented);
        sort($documented);
        $this->assertEquals($implemented, $documented);
    }
}
