<?php

namespace Tests\Feature;

use App\Modules\Import\ImportBatch;
use App\Modules\Import\LegacyDump;
use App\Modules\Import\LegacyExamPlanner;
use App\Modules\Import\LegacyImport;
use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class LegacyImportTest extends TestCase
{
    use RefreshDatabase;

    private string $path;

    protected function setUp(): void
    {
        parent::setUp();
        $this->path = tempnam(sys_get_temp_dir(), 'legacy-dump-');
        file_put_contents($this->path, $this->dump());
    }

    protected function tearDown(): void
    {
        @unlink($this->path);
        parent::tearDown();
    }

    // Synthetic content only, in the real dump's shape: a whole written exam (kategori 2), per-subject copies (kategori 3).
    private function dump(): string
    {
        $answers = fn (int $first, int $question, int $correct, string $prefix = 'Seçenek') => implode(",\n", array_map(
            fn (int $i) => sprintf("(%d, %d, '%s %d', %d)", $first + $i, $question, $prefix, $i + 1, $i === $correct ? 1 : 0),
            [0, 1, 2],
        ));

        return <<<SQL
-- synthetic dump
/*!40101 SET NAMES utf8mb4 */;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
CREATE TABLE `dersler` (
  `ders_id` int(11) NOT NULL,
  `ders_adi` varchar(200) NOT NULL,
  `ders_saati` varchar(100) NOT NULL,
  `ders_seflink` varchar(200) NOT NULL,
  `ders_sira` int(11) NOT NULL,
  `ders_durum` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `dersler` (`ders_id`, `ders_adi`, `ders_saati`, `ders_seflink`, `ders_sira`, `ders_durum`) VALUES
(1, 'SENTETİK HUKUK', '20', 'sentetik-hukuk', 1, 1),
(2, 'SENTETİK İLK YARDIM', '10', 'sentetik-ilk-yardim', 2, 1),
(3, 'SİLAH BİLGİSİ VE ATIŞ', '20', 'silah-bilgisi-ve-atis', 3, 1);
CREATE TABLE `kullanicilar` (
  `id` int(11) NOT NULL,
  `eposta` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `kullanicilar` (`id`, `eposta`) VALUES
(1, 'gizli.kisi@example.test');
CREATE TABLE `sinavlar` (
  `sinav_id` int(11) NOT NULL,
  `sinav_adi` varchar(255) NOT NULL,
  `kategori_id` int(11) NOT NULL,
  `ders_id` int(11) DEFAULT NULL,
  `olusturma_tarihi` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `sinavlar` (`sinav_id`, `sinav_adi`, `kategori_id`, `ders_id`, `olusturma_tarihi`) VALUES
(10, '107.TEMEL EĞİTİM YAZILI SINAV SORULARI', 2, NULL, '2024-03-01 10:00:00'),
(11, '107.TEMEL EĞİTİM SINAV SORULARI', 3, 1, '2024-03-01 10:05:00'),
(12, '100.TEMEL EĞİTİM SINAV SORULARI', 3, 1, '2024-03-01 10:06:00'),
(13, '100.TEMEL EĞİTİM SINAV SORULARI', 3, 3, '2024-03-01 10:07:00');
CREATE TABLE `sorular` (
  `soru_id` int(11) NOT NULL,
  `sinav_id` int(11) NOT NULL,
  `ders_id` int(11) DEFAULT NULL,
  `soru_metni` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `sorular` (`soru_id`, `sinav_id`, `ders_id`, `soru_metni`) VALUES
(1, 10, 1, 'Birinci soru; (a) ''tırnak'''),
(2, 10, 2, 'İkinci soru &amp; ilk yardım\\nsatır'),
(3, 10, 3, 'Silah\\'ın ağırlığı nedir?'),
(4, 10, 2, 'Seçeneği olmayan soru'),
(5, 11, NULL, 'Birinci soru; (a) ''tırnak'''),
(6, 11, NULL, 'Birinci soru; (a) ''tırnak'''),
(7, 11, NULL, 'Yalnız ders setindeki soru'),
(8, 12, NULL, '1- Yüzüncü sınav hukuk sorusu'),
(9, 13, NULL, 'Yüzüncü sınav silah sorusu');
CREATE TABLE `yanitlar` (
  `yanit_id` int(11) NOT NULL,
  `soru_id` int(11) NOT NULL,
  `yanit_metni` text NOT NULL,
  `dogru_mu` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `yanitlar` (`yanit_id`, `soru_id`, `yanit_metni`, `dogru_mu`) VALUES
{$answers(10, 1, 0)},
{$answers(20, 2, 1)},
{$answers(30, 3, 2)},
{$answers(50, 5, 0)},
{$answers(60, 6, 2)},
{$answers(70, 7, 1)},
{$answers(80, 8, 0)},
{$answers(90, 9, 1)};
CREATE TABLE `ogg_sinavlari` (
  `id` int(11) NOT NULL,
  `ogg_sinav_adi` varchar(100) NOT NULL,
  `ogg_sinav_tarihi` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `ogg_sinavlari` (`id`, `ogg_sinav_adi`, `ogg_sinav_tarihi`) VALUES
(1, 'ÖZEL GÜVENLİK 107. TEMEL EĞİTİM VE 83. YENİLEME EĞİTİMİ SINAVI', '2024-02-24');
SQL;
    }

    private function admin()
    {
        return $this->createUser(['platform_role' => 'platform_admin']);
    }

    private function commit(?string $approval = null, $admin = null): array
    {
        $batch = app(LegacyImport::class)->preview($this->path);

        return [$batch, app(LegacyImport::class)->commit($batch, $this->path, $approval ?? substr($batch->report_sha256, 0, 12), $admin ?? $this->admin())];
    }

    public function test_reader_reads_only_requested_tables_with_escapes_and_nulls(): void
    {
        $tables = LegacyDump::read($this->path, LegacyExamPlanner::TABLES);
        $this->assertSame(LegacyExamPlanner::TABLES, array_keys($tables));
        $this->assertSame(9, count($tables['sorular']));
        $this->assertSame("Birinci soru; (a) 'tırnak'", $tables['sorular'][0]['soru_metni']);
        $this->assertSame("Silah'ın ağırlığı nedir?", $tables['sorular'][2]['soru_metni']);
        $this->assertNull($tables['sorular'][4]['ders_id']);
        $this->assertSame(24, count($tables['yanitlar']));
        $this->assertStringNotContainsString('gizli.kisi', json_encode($tables));
    }

    public function test_preview_validates_and_reports_without_creating_content(): void
    {
        $batch = app(LegacyImport::class)->preview($this->path);
        $report = $batch->report;
        $this->assertSame('previewed', $batch->status);
        $this->assertSame(7, $report['stats']['unique_questions']);
        $this->assertSame(0, $report['stats']['rejected']);
        $this->assertSame(1, $report['stats']['incomplete']);
        $this->assertSame(1, $report['stats']['superseded']);
        $this->assertSame(1, $report['stats']['duplicates']);
        $this->assertSame(4, count($report['exams']));
        $this->assertSame(4, $report['exams']['107:silahli']['questions']);
        $this->assertSame(3, $report['exams']['107:silahsiz']['questions']);
        $this->assertFalse($report['exams']['107:silahli']['publishable']);
        $this->assertTrue($report['exams']['100:silahli']['publishable']);
        $this->assertTrue($report['exams']['100:silahli']['reconstructed_order']);
        $this->assertSame('2022-10-30', $report['exams']['100:silahli']['date']);
        $this->assertSame([], $report['errors']);
        $this->assertSame(['Seçenek verisi yok veya eksik.', 'Tek doğru cevap belirlenemedi.'], $report['incomplete_questions'][0]['issues']);
        $this->assertStringNotContainsString('gizli.kisi', json_encode($report));
        $this->assertSame(0, Question::count());
        $this->assertSame(0, OfficialExam::count());
    }

    public function test_repeated_wrong_option_is_kept_complete_but_repeated_correct_option_becomes_an_incomplete_draft(): void
    {
        $answer = fn (int $id, int $question, string $text, int $correct) => ['yanit_id' => $id, 'soru_id' => $question, 'yanit_metni' => $text, 'dogru_mu' => $correct];
        $plan = app(LegacyExamPlanner::class)->plan([
            'dersler' => [['ders_id' => 1, 'ders_adi' => 'Ders', 'ders_seflink' => 'ders', 'ders_sira' => 1]],
            'sinavlar' => [['sinav_id' => 1, 'sinav_adi' => '101.TEMEL EĞİTİM YAZILI SINAV SORULARI', 'kategori_id' => 2, 'ders_id' => null]],
            'sorular' => [['soru_id' => 1, 'sinav_id' => 1, 'ders_id' => 1, 'soru_metni' => 'Tekrarlı yanlış'], ['soru_id' => 2, 'sinav_id' => 1, 'ders_id' => 1, 'soru_metni' => 'Tekrarlı doğru']],
            'yanitlar' => [
                $answer(1, 1, 'A', 0), $answer(2, 1, 'B', 1), $answer(3, 1, 'A', 0),
                $answer(4, 2, 'X', 1), $answer(5, 2, 'Y', 0), $answer(6, 2, 'X', 0),
            ],
            'ogg_sinavlari' => [],
        ]);
        $this->assertCount(2, $plan['questions']);
        $complete = array_values(array_filter($plan['questions'], fn ($q) => $q['complete']));
        $this->assertCount(1, $complete);
        $this->assertSame('Tekrarlı yanlış', $complete[0]['stem']);
        $this->assertSame([['type' => 'duplicate_option_text', 'soru_id' => 1], ['type' => 'duplicate_option_text', 'soru_id' => 2]], array_values(array_filter($plan['warnings'], fn ($w) => $w['type'] === 'duplicate_option_text')));
        $incomplete = array_values(array_filter($plan['questions'], fn ($q) => ! $q['complete']));
        $this->assertSame(['Doğru cevabın metni başka bir seçenekte tekrar ediyor.'], $incomplete[0]['issues']);
        $this->assertFalse($plan['exams'][0]['publishable']);
        $this->assertSame([], $plan['errors']);
    }

    public function test_a_whole_exam_question_without_options_is_completed_from_its_subject_set_copy(): void
    {
        $answer = fn (int $id, int $question, string $text, int $correct) => ['yanit_id' => $id, 'soru_id' => $question, 'yanit_metni' => $text, 'dogru_mu' => $correct];
        $plan = app(LegacyExamPlanner::class)->plan([
            'dersler' => [['ders_id' => 1, 'ders_adi' => 'Ders', 'ders_seflink' => 'ders', 'ders_sira' => 1]],
            'sinavlar' => [
                ['sinav_id' => 1, 'sinav_adi' => '101.TEMEL EĞİTİM YAZILI SINAV SORULARI', 'kategori_id' => 2, 'ders_id' => null],
                ['sinav_id' => 2, 'sinav_adi' => '101.TEMEL EĞİTİM SINAV SORULARI', 'kategori_id' => 3, 'ders_id' => 1],
            ],
            'sorular' => [['soru_id' => 1, 'sinav_id' => 1, 'ders_id' => 1, 'soru_metni' => 'Eksik soru'], ['soru_id' => 2, 'sinav_id' => 2, 'ders_id' => null, 'soru_metni' => 'Eksik soru']],
            'yanitlar' => [$answer(1, 2, 'A', 1), $answer(2, 2, 'B', 0)],
            'ogg_sinavlari' => [],
        ]);
        $this->assertCount(1, $plan['questions']);
        $this->assertTrue(array_values($plan['questions'])[0]['complete']);
        $this->assertSame(1, $plan['stats']['repaired']);
        $this->assertSame(0, $plan['stats']['incomplete']);
        $this->assertTrue($plan['exams'][0]['publishable']);
        $this->assertCount(1, $plan['exams'][0]['hashes']);
    }

    public function test_commit_publishes_questions_and_exams_with_original_order_and_cleaned_text(): void
    {
        [, $created] = $this->commit();
        $this->assertSame(['subjects' => 3, 'sources' => 2, 'questions' => 6, 'draft_questions' => 1, 'exams' => 2, 'draft_exams' => 2], $created);
        $this->assertSame(6, Question::whereNotNull('published_version_id')->count());
        $this->assertSame(1, Question::whereNull('published_version_id')->count());
        $this->assertSame(2, OfficialExam::whereNotNull('published_at')->count());
        $this->assertSame(2, OfficialExam::whereNull('published_at')->count());
        $stems = Question::with('latestVersion')->get()->map(fn ($q) => $q->latestVersion->stem)->all();
        $this->assertContains("İkinci soru & ilk yardım\nsatır", $stems);
        $this->assertContains('Yüzüncü sınav hukuk sorusu', $stems);
        $this->assertContains('Yalnız ders setindeki soru', $stems);
        $armed = OfficialExam::where('title', 'like', 'ÖGG 107%Silahlı')->firstOrFail();
        $this->assertSame(107, (int) $armed->exam_number);
        $this->assertSame(2024, $armed->year);
        $this->assertSame('Şubat', $armed->term);
        $this->assertNull($armed->published_at);
        $this->assertSame(['Birinci soru; (a) \'tırnak\'', "İkinci soru & ilk yardım\nsatır", "Silah'ın ağırlığı nedir?", 'Seçeneği olmayan soru'], $armed->questions()->with('questionVersion')->get()->map(fn ($row) => $row->questionVersion->stem)->all());
        $unarmed = OfficialExam::where('title', 'like', 'ÖGG 107%Silahsız')->firstOrFail();
        $this->assertSame(3, $unarmed->questions()->count());
        $this->assertSame('ÖGG 100. Temel Eğitim Sınavı (30.10.2022) — Silahlı', OfficialExam::where('exam_number', '100')->where('title', 'like', '%Silahlı')->firstOrFail()->title);
        $draft = Question::whereNull('published_version_id')->firstOrFail()->latestVersion;
        $this->assertSame('Seçeneği olmayan soru', $draft->stem);
        $this->assertSame(0, $draft->options()->count());
        $this->assertNull($draft->correct_option_id);
        $version = Question::whereHas('publishedVersion', fn ($q) => $q->where('stem', 'Birinci soru; (a) \'tırnak\''))->firstOrFail()->publishedVersion;
        $this->assertSame(3, $version->options()->count());
        $this->assertSame('Seçenek 1', $version->options()->where('id', $version->correct_option_id)->value('text'));
        $this->assertStringContainsString('yeniden kullanım hakkı ürün sahibince beyan edilmiştir', $version->source->citation);
        $this->assertDatabaseHas('audit_events', ['action' => 'import.committed']);
    }

    public function test_rerunning_the_import_never_duplicates_content(): void
    {
        $this->commit();
        $admin = $this->admin();
        [, $again] = $this->commit(null, $admin);
        $this->assertSame(['subjects' => 0, 'sources' => 0, 'questions' => 0, 'draft_questions' => 0, 'exams' => 0, 'draft_exams' => 0], $again);
        $this->assertSame(7, Question::count());
        $this->assertSame(4, OfficialExam::count());
    }

    public function test_commit_requires_the_reviewed_report_the_unchanged_file_and_a_platform_admin(): void
    {
        $batch = app(LegacyImport::class)->preview($this->path);
        $code = substr($batch->report_sha256, 0, 12);
        foreach ([
            fn () => app(LegacyImport::class)->commit($batch, $this->path, 'deadbeef0000', $this->admin()),
            fn () => app(LegacyImport::class)->commit($batch, $this->path, $code, $this->createUser()),
        ] as $attempt) {
            try {
                $attempt();
                $this->fail('Commit was accepted without valid approval.');
            } catch (RuntimeException) {
                $this->assertSame(0, Question::count());
            }
        }
        file_put_contents($this->path, str_replace('Yalnız ders setindeki soru', 'Değiştirilmiş soru', $this->dump()));
        $this->expectException(RuntimeException::class);
        app(LegacyImport::class)->commit($batch, $this->path, $code, $this->admin());
    }

    public function test_a_committed_batch_cannot_be_committed_again_and_files_stay_unchanged(): void
    {
        $before = hash_file('sha256', $this->path);
        [$batch] = $this->commit();
        $this->assertSame($before, hash_file('sha256', $this->path));
        $this->assertSame('committed', ImportBatch::find($batch->id)->status);
        $this->expectException(RuntimeException::class);
        app(LegacyImport::class)->commit($batch->fresh(), $this->path, substr($batch->report_sha256, 0, 12), $this->admin());
    }

    public function test_armed_exams_beyond_one_hundred_questions_can_be_attempted(): void
    {
        $admin = $this->admin();
        $subject = Subject::create(['name' => 'Sentetik ders', 'code' => 'big']);
        $source = QuestionSource::create(['title' => 'Sentetik kaynak']);
        $type = ExamType::create(['name' => 'Sentetik', 'code' => 'big']);
        $versions = [];
        foreach (range(1, 125) as $i) {
            $q = app(SaveQuestion::class)->execute($admin, ['subject_id' => $subject->id, 'source_id' => $source->id, 'stem' => "Sentetik {$i}", 'options' => ['A', 'B'], 'correct_option_position' => 1]);
            $versions[] = app(PublishQuestion::class)->execute($admin, $q, $q->revision)->published_version_id;
        }
        $exam = app(SaveOfficialExam::class)->execute($admin, ['exam_type_id' => $type->id, 'title' => '125 soru', 'year' => 2024, 'question_version_ids' => $versions]);
        app(PublishOfficialExam::class)->execute($admin, $exam);
        $student = $this->createUser();
        $this->asToken($student);
        $response = $this->postJson('/api/v1/contexts/'.$student->studyContexts()->firstOrFail()->id.'/exam-attempts', ['id' => (string) Str::uuid(), 'official_exam_id' => $exam->id, 'duration_seconds' => 7200])->assertOk();
        $this->assertSame(125, $response->json('data.question_count'));
        $this->assertCount(125, $response->json('data.questions'));
        $this->assertSame('Sentetik 125', $response->json('data.questions.124.question.stem'));
    }
}
