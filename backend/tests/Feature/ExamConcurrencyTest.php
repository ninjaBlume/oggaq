<?php

namespace Tests\Feature;

use App\Modules\Exams\Actions\StartExam;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExamConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    public function test_two_independent_connections_finish_the_same_exam_only_once(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $subject = Subject::create(['name' => 'Sentetik yarış', 'code' => 'race']);
        $source = QuestionSource::create(['title' => 'Sentetik test']);
        $question = app(SaveQuestion::class)->execute($admin, ['subject_id' => $subject->id, 'source_id' => $source->id, 'stem' => 'Sentetik soru', 'options' => ['A', 'B'], 'correct_option_position' => 1]);
        app(PublishQuestion::class)->execute($admin, $question, $question->revision);
        $student = $this->createUser(['email' => 'exam-race@example.test']);
        $context = $student->studyContexts()->firstOrFail();
        $exam = app(StartExam::class)->execute($student, $context->id, ['id' => (string) Str::uuid(), 'question_count' => 1, 'duration_seconds' => 60]);
        $workers = [];
        try {
            for ($i = 0; $i < 2; $i++) {
                $pipes = [];
                $process = proc_open([PHP_BINARY, base_path('tests/Support/exam-race-worker.php'), $student->id, $context->id, $exam->id], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, base_path(), array_merge(getenv(), ['APP_ENV' => 'testing']));
                $this->assertIsResource($process);
                $workers[] = [$process, $pipes];
            }
            foreach ($workers as [$process,$pipes]) {
                fwrite($pipes[0], "go\n");
                fclose($pipes[0]);
            }
            $results = [];
            foreach ($workers as [$process,$pipes]) {
                stream_set_timeout($pipes[1], 20);
                $output = stream_get_contents($pipes[1]);
                $errors = stream_get_contents($pipes[2]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                $this->assertSame(0, proc_close($process), $errors);
                $results[] = json_decode($output, true, flags: JSON_THROW_ON_ERROR);
            }
            $workers = [];
            $this->assertSame($results[0], $results[1]);
            $this->assertSame(2, $results[0]['revision']);
            $this->assertDatabaseHas('exam_attempts', ['id' => $exam->id, 'revision' => 2, 'blank_count' => 1, 'finish_reason' => 'manual']);
        } finally {
            foreach ($workers as [$process,$pipes]) {
                if (is_resource($process)) {
                    proc_terminate($process);
                }foreach ($pipes as $pipe) {
                    if (is_resource($pipe)) {
                        fclose($pipe);
                    }
                }if (is_resource($process)) {
                    proc_close($process);
                }
            }
        }
    }
}
