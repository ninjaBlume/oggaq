<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Import\ImportBatch;
use App\Modules\Import\ReviewedBookletImport;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\Scoring\Models\ScoringRule;
use App\Support\ApiProblem;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ReviewedBookletImportTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private array $plan;

    private array $files;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->createUser(['platform_role' => 'platform_admin']);
        Subject::create(['code' => 'synthetic-general', 'name' => 'Synthetic general']);
        Subject::create(['code' => 'silah-bilgisi-ve-atis', 'name' => 'Synthetic weapons']);
        ExamType::create(['code' => 'ogg-deneme', 'name' => 'Synthetic whole exam']);
        foreach (['armed', 'unarmed'] as $weapon) {
            $armed = $weapon === 'armed';
            ScoringRule::create(['code' => 'synthetic-renewal-'.$weapon, 'version' => 1, 'title' => 'Synthetic level rule', 'education_type' => 'renewal',
                'weapon_status' => $weapon, 'effective_from' => '2026-01-01', 'effective_until' => '2026-12-31', 'period_from' => 1, 'period_until' => 500,
                'configuration' => ['general_count' => 100, 'weapon_count' => $armed ? 25 : 0, 'shooting_count' => $armed ? 5 : 0,
                    'general_maximum' => 100, 'weapon_maximum' => $armed ? 50 : 0, 'shooting_maximum' => $armed ? 50 : 0,
                    'general_weight' => $armed ? 5000 : 10000, 'weapon_weight' => $armed ? 2500 : 0, 'shooting_weight' => $armed ? 2500 : 0,
                    'requires_previous' => false, 'minimums' => [], 'decision_mode' => 'level', 'decimals' => 2, 'formula' => 'Synthetic fixture formula'],
                'source_urls' => ['https://example.test/synthetic-guide'], 'verification_note' => 'Synthetic test only', 'created_at' => now(), 'published_at' => now()]);
        }
        $this->files = [tempnam(sys_get_temp_dir(), 'booklet-plan-'), tempnam(sys_get_temp_dir(), 'booklet-pdf-'), tempnam(sys_get_temp_dir(), 'booklet-evidence-')];
        foreach (array_slice($this->files, 1) as $file) {
            file_put_contents($file, '%PDF-1.4 synthetic evidence; not an actual exam');
        }
        $this->plan = ['education_type' => 'renewal', 'exam_number' => 98, 'exam_date' => '2026-08-29', 'source_url' => 'https://source.example.test/booklet.pdf',
            'evidence_url' => 'https://second.example.test/booklet.pdf', 'pdf_sha256' => hash_file('sha256', $this->files[1]),
            'visual_reviewed' => true, 'subjects_reviewed' => true, 'ab_matching_questions' => 125,
            'scoring_rule_codes' => ['armed' => 'synthetic-renewal-armed', 'unarmed' => 'synthetic-renewal-unarmed'], 'questions' => []];
        foreach (range(1, 125) as $n) {
            $this->plan['questions'][] = ['position' => $n, 'subject_code' => $n > 100 ? 'silah-bilgisi-ve-atis' : 'synthetic-general',
                'stem' => 'Synthetic reviewed question '.$n, 'options' => array_map(fn ($l) => 'Synthetic '.$l.' '.$n, range('A', 'E')), 'correct_option_position' => 1];
        }
        $this->writePlan();
    }

    protected function tearDown(): void
    {
        foreach ($this->files as $file) {
            @unlink($file);
        }
        parent::tearDown();
    }

    private function writePlan(): void
    {
        file_put_contents($this->files[0], json_encode($this->plan, JSON_THROW_ON_ERROR));
    }

    private function preview(): ImportBatch
    {
        return app(ReviewedBookletImport::class)->preview($this->admin, ...$this->files);
    }

    private function commit(ImportBatch $batch): array
    {
        return app(ReviewedBookletImport::class)->commit($this->admin, $batch->id, ...[...$this->files, substr($batch->report_sha256, 0, 12)]);
    }

    public function test_reviewed_import_publishes_both_variants_pins_scoring_and_retries_without_duplicates(): void
    {
        $q = $this->plan['questions'][0];
        $source = QuestionSource::create(['title' => 'Synthetic existing source']);
        $existing = app(SaveQuestion::class)->execute($this->admin, ['subject_id' => Subject::where('code', 'synthetic-general')->firstOrFail()->id,
            'source_id' => $source->id, 'stem' => $q['stem'], 'options' => $q['options'], 'correct_option_position' => 1]);
        $existing = app(PublishQuestion::class)->execute($this->admin, $existing, $existing->revision);
        $version = $existing->published_version_id;
        $revision = $existing->revision;
        $batch = $this->preview();
        $this->assertDatabaseCount('questions', 1);
        $this->assertDatabaseCount('official_exams', 0);
        $this->assertSame(1, $batch->report['reusable_questions']);
        $result = $this->commit($batch);
        $this->assertSame(124, $result['created_questions']);
        $this->assertSame(1, $result['reused_questions']);
        $this->assertEquals($result, $this->commit($batch));
        $this->assertEquals($result, $this->commit($this->preview()));
        $this->assertDatabaseCount('questions', 125);
        $this->assertDatabaseCount('question_versions', 125);
        $this->assertDatabaseCount('official_exams', 2);
        $this->assertDatabaseCount('scoring_periods', 2);
        $this->assertSame($revision, $existing->fresh()->revision);
        $this->assertSame($version, $existing->fresh()->published_version_id);
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/official-exams?education_type=renewal&weapon_status=armed')->assertOk()->assertJsonPath('data.0.question_count', 125);
        $this->getJson('/api/v1/official-exams?education_type=renewal&weapon_status=unarmed')->assertOk()->assertJsonPath('data.0.question_count', 100);
        $this->getJson('/api/v1/official-exams?education_type=basic')->assertOk()->assertJsonCount(0, 'data');
        $this->assertSame('renewal', OfficialExam::findOrFail($result['unarmed_exam_id'])->education_type);
    }

    public function test_changed_json_or_evidence_invalidates_approval_without_creating_content(): void
    {
        $batch = $this->preview();
        $this->plan['questions'][0]['stem'] .= ' altered';
        $this->writePlan();
        try {
            $this->commit($batch);
            $this->fail('Changed snapshot was accepted');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('önizlemeyle', $e->getMessage());
        }
        $this->assertDatabaseCount('questions', 0);
        $this->assertDatabaseCount('official_exams', 0);
        file_put_contents($this->files[2], '%PDF-1.4 changed evidence');
        $this->expectExceptionMessage('PDF kanıtı');
        $this->preview();
    }

    public function test_invalid_section_and_revoked_admin_are_rejected(): void
    {
        $batch = $this->preview();
        DB::table('users')->where('id', $this->admin->id)->update(['platform_role' => 'student']);
        try {
            $this->commit($batch);
            $this->fail('Revoked actor was accepted');
        } catch (AuthorizationException) {
            $this->assertDatabaseCount('official_exams', 0);
        }
        DB::table('users')->where('id', $this->admin->id)->update(['platform_role' => 'platform_admin']);
        $this->plan['questions'][100]['subject_code'] = 'synthetic-general';
        $this->writePlan();
        $this->expectExceptionMessage('silah bölümü');
        $this->preview();
    }

    public function test_existing_exam_conflict_rolls_back_new_questions_periods_and_source(): void
    {
        $batch = $this->preview();
        $result = $this->commit($batch);
        $this->plan['questions'][0]['stem'] .= ' different approved content';
        $this->writePlan();
        $other = $this->preview();
        try {
            $this->commit($other);
            $this->fail('Existing import identity was overwritten');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('ezilemez', $e->getMessage());
        }
        $this->assertDatabaseCount('questions', 125);
        $this->assertDatabaseCount('official_exams', 2);
        $this->assertSame($result['armed_exam_id'], OfficialExam::where('weapon_status', 'armed')->firstOrFail()->id);
    }

    public function test_late_exam_conflict_rolls_back_all_new_content(): void
    {
        $source = QuestionSource::create(['title' => 'Synthetic pre-existing source']);
        $q = $this->plan['questions'][0];
        $question = app(SaveQuestion::class)->execute($this->admin, ['subject_id' => Subject::where('code', 'synthetic-general')->firstOrFail()->id,
            'source_id' => $source->id, 'stem' => $q['stem'], 'options' => $q['options'], 'correct_option_position' => 1]);
        $question = app(PublishQuestion::class)->execute($this->admin, $question, $question->revision);
        $exam = app(SaveOfficialExam::class)->execute($this->admin, ['education_type' => 'renewal', 'exam_type_id' => ExamType::firstOrFail()->id,
            'title' => 'Synthetic conflicting identity', 'year' => 2026, 'term' => '08', 'exam_number' => '98', 'weapon_status' => 'armed', 'question_version_ids' => [$question->published_version_id]]);
        $batch = $this->preview();
        try {
            $this->commit($batch);
            $this->fail('Conflicting exam identity was accepted');
        } catch (ApiProblem $e) {
            $this->assertDatabaseCount('questions', 1);
            $this->assertDatabaseCount('question_sources', 1);
            $this->assertDatabaseCount('scoring_periods', 0);
            $this->assertDatabaseCount('official_exams', 1);
            $this->assertDatabaseCount('import_records', 0);
            $this->assertSame('previewed', $batch->fresh()->status);
            $this->assertNull($exam->fresh()->published_at);
        }
    }

    public function test_unreviewed_plan_cannot_be_staged(): void
    {
        $this->plan['visual_reviewed'] = false;
        $this->writePlan();
        $this->expectException(ValidationException::class);
        $this->preview();
    }

    public function test_modified_report_invalidates_approval(): void
    {
        $batch = $this->preview();
        $batch->forceFill(['report' => array_replace($batch->report, ['exam_number' => 99])])->save();
        $this->expectExceptionMessage('önizlemeyle');
        $this->commit($batch);
    }
}
