<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\RandomExamPool;
use Tests\TestCase;

class RandomExamConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    public function test_two_devices_with_different_settings_get_the_same_open_random_exam(): void
    {
        RandomExamPool::create($this->createUser(['platform_role' => 'platform_admin']));
        $student = $this->createUser(['email' => 'random-race@example.test']);
        $context = $student->studyContexts()->firstOrFail()->id;
        $workers = [];
        try {
            foreach (['armed', 'unarmed'] as $weapon) {
                $pipes = [];
                $process = proc_open([PHP_BINARY, base_path('tests/Support/random-exam-race-worker.php'), $student->id, $context, (string) Str::uuid(), $weapon],
                    [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, base_path(), array_merge(getenv(), ['APP_ENV' => 'testing']));
                $this->assertIsResource($process);
                $workers[] = [$process, $pipes];
            }
            foreach ($workers as [$process, $pipes]) {
                fwrite($pipes[0], "go\n");
                fclose($pipes[0]);
            }
            $results = [];
            foreach ($workers as [$process, $pipes]) {
                stream_set_timeout($pipes[1], 20);
                $output = stream_get_contents($pipes[1]);
                $error = stream_get_contents($pipes[2]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                $this->assertSame(0, proc_close($process), $error);
                $results[] = json_decode($output, true, flags: JSON_THROW_ON_ERROR);
            }
            $workers = [];
            $this->assertSame($results[0], $results[1]);
            $this->assertContains($results[0]['count'], [100, 125]);
            $this->assertDatabaseCount('exam_attempts', 1);
            $this->assertDatabaseCount('exam_answers', $results[0]['count']);
        } finally {
            foreach ($workers as [$process, $pipes]) {
                if (is_resource($process)) {
                    proc_terminate($process);
                }
                foreach ($pipes as $pipe) {
                    if (is_resource($pipe)) {
                        fclose($pipe);
                    }
                }
                if (is_resource($process)) {
                    proc_close($process);
                }
            }
            // Permit the test framework's rollback; never run this cleanup against another database.
            DB::transaction(function () use ($context) {
                DB::statement("SET LOCAL oggaq.account_erasure = 'on'");
                DB::table('exam_answers')->whereIn('exam_attempt_id', DB::table('exam_attempts')->where('study_context_id', $context)->select('id'))->delete();
                DB::table('exam_attempts')->where('study_context_id', $context)->delete();
                DB::statement('TRUNCATE TABLE official_exams CASCADE');
            });
        }
    }
}
