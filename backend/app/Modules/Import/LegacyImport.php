<?php

namespace App\Modules\Import;

use App\Models\User;
use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

// Preview writes nothing but the batch record; commit re-reads the same file, proves it is the file that was previewed
// and approved, then creates published central content through the normal domain actions, idempotently.
class LegacyImport
{
    private const SYSTEM = 'asvip-dump';

    // Exam types are Temel and Yenileme; armed/unarmed is a separate attribute. The dump only holds Temel exams,
    // the Yenileme type is created so editors can add those exams to the same catalog.
    private const EXAM_TYPES = [
        'temel' => ['code' => 'ogg-temel', 'name' => 'Temel Eğitim'],
        'yenileme' => ['code' => 'ogg-yenileme', 'name' => 'Yenileme Eğitimi'],
    ];

    private const WEAPON_STATUS = ['silahli' => 'armed', 'silahsiz' => 'unarmed'];

    public function __construct(private LegacyExamPlanner $planner, private SaveQuestion $saveQuestion, private PublishQuestion $publishQuestion, private SaveOfficialExam $saveExam, private PublishOfficialExam $publishExam) {}

    public function preview(string $path, ?User $actor = null): ImportBatch
    {
        [$plan, $fileHash] = $this->load($path);
        $report = $this->report($plan);
        $batch = new ImportBatch;
        $batch->forceFill([
            'source_system' => self::SYSTEM, 'source_name' => basename($path), 'source_sha256' => $fileHash, 'adapter_version' => LegacyExamPlanner::VERSION,
            'plan_sha256' => $this->planHash($plan), 'report_sha256' => hash('sha256', json_encode($report, JSON_UNESCAPED_UNICODE)),
            'report' => $report, 'status' => 'previewed', 'created_by' => $actor?->id,
        ])->save();

        return $batch;
    }

    public function commit(ImportBatch $batch, string $path, string $approval, User $approver): array
    {
        if ($batch->status !== 'previewed') {
            throw new RuntimeException('Bu içe aktarma zaten işlendi veya başarısız oldu; yeni bir önizleme oluşturun.');
        }
        if (! $approver->isPlatformAdmin() || ! $approver->hasVerifiedEmail() || $approver->status !== 'active') {
            throw new RuntimeException('Onaylayan doğrulanmış aktif bir platform yöneticisi olmalı.');
        }
        if (! hash_equals(substr($batch->report_sha256, 0, 12), strtolower($approval))) {
            throw new RuntimeException('Onay kodu önizleme raporuyla eşleşmiyor.');
        }
        [$plan, $fileHash] = $this->load($path);
        if ($fileHash !== $batch->source_sha256 || $this->planHash($plan) !== $batch->plan_sha256) {
            throw new RuntimeException('Dosya veya eşleme önizlemedeki ile aynı değil; onay geçersiz.');
        }
        try {
            $result = $this->apply($batch, $plan, $approver);
        } catch (\Throwable $error) {
            $batch->forceFill(['status' => 'failed', 'failure' => mb_substr($error->getMessage(), 0, 2000)])->save();
            throw $error;
        }
        $batch->forceFill(['status' => 'committed', 'approved_by' => $approver->id, 'approved_at' => now(), 'committed_at' => now()])->save();
        DB::table('audit_events')->insert(['id' => Str::uuid(), 'actor_id' => $approver->id, 'tenant_id' => null, 'target_id' => $batch->id, 'action' => 'import.committed', 'created_at' => now()]);

        return $result;
    }

    private function apply(ImportBatch $batch, array $plan, User $actor): array
    {
        $created = ['subjects' => 0, 'sources' => 0, 'questions' => 0, 'draft_questions' => 0, 'exams' => 0, 'draft_exams' => 0];
        $subjectIds = [];
        foreach ($plan['subjects'] as $legacyId => $subject) {
            $model = Subject::firstOrCreate(['code' => $subject['code']], ['name' => $subject['name']]);
            $created['subjects'] += (int) $model->wasRecentlyCreated;
            $subjectIds[$legacyId] = $model->id;
        }
        $types = [];
        foreach (self::EXAM_TYPES as $kind => $type) {
            $types[$kind] = ExamType::firstOrCreate(['code' => $type['code']], ['name' => $type['name']])->id;
        }
        $sourceIds = [];
        foreach ($plan['sources'] as $number => $source) {
            $model = QuestionSource::firstOrCreate(['title' => $source['title']], ['citation' => $this->citation($number, $source['date'])]);
            $created['sources'] += (int) $model->wasRecentlyCreated;
            $sourceIds[$number] = $model->id;
        }
        $versions = [];
        foreach ($plan['questions'] as $hash => $question) {
            $key = substr($hash, 0, 40);
            $versions[$hash] = DB::transaction(function () use ($batch, $actor, $key, $question, $subjectIds, $sourceIds, &$created) {
                $existing = DB::table('import_records')->where(['source_system' => self::SYSTEM, 'source_table' => 'question', 'source_key' => $key])->value('target_id');
                if ($existing !== null) {
                    $row = Question::whereKey($existing)->first(['published_version_id', 'latest_version_id']);

                    return $row->published_version_id ?? $row->latest_version_id;
                }
                $saved = $this->saveQuestion->execute($actor, [
                    'subject_id' => $subjectIds[$question['subject']], 'source_id' => $sourceIds[$question['source_number']], 'stem' => $question['stem'],
                    'options' => $question['options'], 'correct_option_position' => $question['correct'] === null ? null : $question['correct'] + 1,
                ]);
                // Incomplete questions stay drafts: a question without a reliable answer key must never reach students.
                if ($question['complete']) {
                    $saved = $this->publishQuestion->execute($actor, $saved, $saved->revision);
                }
                $this->record($batch, 'question', $key, 'question', $saved->id);
                $created[$question['complete'] ? 'questions' : 'draft_questions']++;

                return $saved->published_version_id ?? $saved->latest_version_id;
            });
        }
        foreach ($plan['exams'] as $exam) {
            DB::transaction(function () use ($batch, $actor, $exam, $versions, $types, $sourceIds, &$created) {
                $key = $exam['key'];
                if (DB::table('import_records')->where(['source_system' => self::SYSTEM, 'source_table' => 'official_exam', 'source_key' => $key])->exists()) {
                    return;
                }
                $saved = $this->saveExam->execute($actor, [
                    'exam_type_id' => $types['temel'], 'weapon_status' => self::WEAPON_STATUS[$exam['variant']], 'source_id' => $sourceIds[$exam['number']], 'title' => $exam['title'], 'year' => $exam['year'],
                    'term' => $exam['term'], 'exam_number' => (string) $exam['number'], 'question_version_ids' => array_map(fn ($hash) => $versions[$hash], $exam['hashes']),
                ]);
                // An exam with unfinished questions stays a draft until editors complete and publish them.
                if ($exam['publishable']) {
                    $this->publishExam->execute($actor, $saved);
                }
                $this->record($batch, 'official_exam', $key, 'official_exam', $saved->id);
                $created[$exam['publishable'] ? 'exams' : 'draft_exams']++;
            });
        }

        return $created;
    }

    private function record(ImportBatch $batch, string $table, string $key, string $type, string $id): void
    {
        DB::table('import_records')->insert(['source_system' => self::SYSTEM, 'source_table' => $table, 'source_key' => $key, 'batch_id' => $batch->id, 'target_type' => $type, 'target_id' => $id, 'created_at' => now()]);
    }

    private function citation(int $number, ?string $date): string
    {
        $when = $date === null ? '' : ' ('.date('d.m.Y', strtotime($date)).')';

        return "T.C. İçişleri Bakanlığı Emniyet Genel Müdürlüğü tarafından uygulanan {$number}. Temel Eğitim sınavında yayımlanan sorular{$when}. İçe aktarma kaynağı: kurum arşiv veritabanı; yeniden kullanım hakkı ürün sahibince beyan edilmiştir.";
    }

    /** @return array{0: array, 1: string} */
    private function load(string $path): array
    {
        if (! is_file($path)) {
            throw new RuntimeException('Kaynak dosya bulunamadı.');
        }

        return [$this->planner->plan(LegacyDump::read($path, LegacyExamPlanner::TABLES)), hash_file('sha256', $path)];
    }

    private function planHash(array $plan): string
    {
        return hash('sha256', json_encode([$plan['subjects'], $plan['sources'], $plan['questions'], $plan['exams']], JSON_UNESCAPED_UNICODE));
    }

    // The report is what the approver reviews: counts and flagged items, never student or institution personal data.
    private function report(array $plan): array
    {
        $by = fn (string $type) => array_values(array_filter($plan['warnings'], fn ($w) => $w['type'] === $type));
        $sizes = [];
        foreach ($plan['exams'] as $exam) {
            $sizes[$exam['key']] = ['questions' => count($exam['hashes']), 'date' => $exam['date'], 'reconstructed_order' => $exam['reconstructed_order'], 'publishable' => $exam['publishable']];
        }

        return [
            'adapter' => $plan['adapter'], 'stats' => $plan['stats'], 'subjects' => count($plan['subjects']), 'sources' => count($plan['sources']),
            'exams' => $sizes, 'errors' => $plan['errors'],
            'warning_counts' => array_count_values(array_column($plan['warnings'], 'type')),
            'superseded' => $by('superseded_by_full_exam'), 'same_stem_different_options' => $by('same_stem_different_options'),
            'corrections_applied' => array_map(fn ($id) => ['rule' => $id, 'questions' => $plan['stats']['corrections'][$id], 'evidence' => LegacyCorrections::RULES[$id]['evidence']], array_keys($plan['stats']['corrections'])), 'incomplete_questions' => $by('incomplete_question'), 'repaired_from_subject_set' => $by('repaired_from_subject_set'), 'subject_conflicts' => $by('subject_conflict'), 'duplicate_option_text' => $by('duplicate_option_text'), 'repeated_in_exam' => $by('repeated_in_exam'), 'date_conflicts' => $by('date_conflict'),
            'stem_number_removed' => $plan['clean_log'],
        ];
    }
}
