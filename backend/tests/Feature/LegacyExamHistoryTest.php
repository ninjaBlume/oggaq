<?php

namespace Tests\Feature;

use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\LegacyExamFragments;
use Tests\TestCase;

class LegacyExamHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_original_result_is_preserved_and_legacy_one_and_eleven_question_fragments_never_appear_as_exams(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $student = $this->createUser();
        $fixture = LegacyExamFragments::create($admin, $student);
        $this->asToken($student);
        $path = '/api/v1/contexts/'.$fixture['context'];
        $before = DB::table('exam_attempts')->orderBy('id')->get()->toJson();
        $answers = DB::table('exam_answers')->orderBy('id')->get()->toJson();
        $this->getJson($path.'/exam-attempts?per_page=3')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $fixture['original']);
        $this->getJson($path.'/exam-attempts?per_page=1')->assertOk()->assertJsonPath('data.0.id', $fixture['original'])->assertJsonPath('links.next', null);
        $this->getJson($path.'/exam-attempts?scope=all')->assertOk()->assertJsonCount(3, 'data');
        $stats = $this->getJson($path.'/stats')->assertOk()->json('data');
        $this->assertEquals(['completed' => 1, 'average_score_percent' => 38.89, 'best_score_percent' => 38.89], $stats['exams']);
        $this->assertSame(30, $stats['answers']['total']);
        $this->assertSame(18, $stats['answers']['correct']);
        $this->assertSame(12, $stats['answers']['incorrect']);
        foreach ($fixture['fragments'] as $id) {
            $this->getJson($path.'/exam-attempts/'.$id)->assertOk();
        }
        $this->assertSame($before, DB::table('exam_attempts')->orderBy('id')->get()->toJson());
        $this->assertSame($answers, DB::table('exam_answers')->orderBy('id')->get()->toJson());
        $this->asToken($this->createUser());
        $this->getJson($path.'/exam-attempts?scope=all')->assertNotFound();
    }

    public function test_real_one_question_template_and_generated_random_exam_remain_exam_results(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $student = $this->createUser();
        $fixture = LegacyExamFragments::create($admin, $student);
        $source = ExamAttempt::findOrFail($fixture['original'])->officialExam;
        $template = app(SaveOfficialExam::class)->execute($admin, ['exam_type_id' => $source->exam_type_id, 'title' => 'Sentetik tek soruluk ders',
            'subject_id' => $source->subject_id, 'year' => 2026, 'exam_number' => '123', 'weapon_status' => 'armed', 'question_version_ids' => [$source->questions()->firstOrFail()->question_version_id]]);
        app(PublishOfficialExam::class)->execute($admin, $template);
        $this->asToken($student);
        $path = '/api/v1/contexts/'.$fixture['context'];
        $one = $this->postJson($path.'/exam-attempts', ['id' => (string) Str::uuid(), 'official_exam_id' => $template->id, 'duration_seconds' => 600])->assertOk()->json('data.id');
        $random = $this->postJson($path.'/random-exam', ['id' => (string) Str::uuid(), 'education_type' => 'basic', 'weapon_status' => 'weapon_difference', 'duration_seconds' => 1800])->assertOk()->json('data.id');
        $ids = $this->getJson($path.'/exam-attempts')->assertOk()->assertJsonCount(3, 'data')->json('data.*.id');
        $this->assertEqualsCanonicalizing([$fixture['original'], $one, $random], $ids);
    }
}
