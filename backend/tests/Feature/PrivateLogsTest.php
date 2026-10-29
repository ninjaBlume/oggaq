<?php

namespace Tests\Feature;

use App\Support\PrivateLogProcessor;
use Illuminate\Support\Facades\Log;
use Monolog\Level;
use Monolog\LogRecord;
use Tests\TestCase;

class PrivateLogsTest extends TestCase
{
    public function test_exception_sql_message_context_and_trace_arguments_never_reach_output(): void
    {
        $request = '12345678-1234-1234-1234-123456789012';
        $error = new \RuntimeException('SQL bindings: synthetic@example.test password=private token=private belge=özel');
        $record = new LogRecord(new \DateTimeImmutable, 'app', Level::Error, $error->getMessage(), [
            'exception' => $error, 'request_id' => $request, 'body' => 'belge içeriği', 'headers' => ['Authorization' => 'Bearer private'],
        ], ['email' => 'synthetic@example.test']);
        $safe = (new PrivateLogProcessor)($record);
        $encoded = json_encode([$safe->message, $safe->context, $safe->extra]);
        foreach (['synthetic@', 'private', 'belge içeriği', 'SQL bindings', 'Authorization'] as $secret) {
            $this->assertStringNotContainsString($secret, $encoded);
        }
        $this->assertSame($request, $safe->context['request_id']);
        $this->assertSame('RuntimeException', $safe->context['exception_type']);
        $this->assertNotEmpty($safe->context['trace']);
    }

    public function test_real_daily_channel_redacts_and_file_prune_is_date_based_scoped_and_preview_first(): void
    {
        $dir = sys_get_temp_dir().'/oggsor-logs-'.bin2hex(random_bytes(6));
        mkdir($dir, 0700);
        $old = storage_path();
        $this->app->useStoragePath($dir);
        mkdir($dir.'/logs', 0700);
        try {
            config(['logging.channels.daily.path' => $dir.'/logs/laravel.log']);
            Log::forgetChannel('daily');
            Log::channel('daily')->error('private user text synthetic@example.test', ['password' => 'secret']);
            $current = $dir.'/logs/laravel-'.now()->format('Y-m-d').'.log';
            $this->assertStringNotContainsString('synthetic@', file_get_contents($current));
            $this->assertStringContainsString('application.event', file_get_contents($current));
            $expired = $dir.'/logs/laravel-'.now()->subDays(14)->format('Y-m-d').'.log';
            file_put_contents($expired, 'old');
            $other = $dir.'/logs/unrelated.log';
            file_put_contents($other, 'keep');
            symlink($other, $dir.'/logs/laravel-2000-01-01.log');
            $this->artisan('privacy:prune-logs')->assertSuccessful();
            $this->assertFileExists($expired);
            $this->artisan('privacy:prune-logs', ['--force' => true])->assertSuccessful();
            $this->assertFileDoesNotExist($expired);
            $this->assertFileExists($current);
            $this->assertFileExists($other);
        } finally {
            Log::forgetChannel('daily');
            $this->app->useStoragePath($old);
            foreach (glob($dir.'/logs/*') as $file) {
                unlink($file);
            }
            rmdir($dir.'/logs');
            rmdir($dir);
        }
    }
}
