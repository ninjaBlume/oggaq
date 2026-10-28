<?php

namespace App\Modules\Import;

use App\Models\User;
use App\Modules\QuestionBank\Actions\CreateCatalogEntry;
use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\Scoring\Actions\ManageScoring;
use App\Modules\Scoring\Models\ScoringPeriod;
use App\Modules\Scoring\Models\ScoringRule;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;

// A reviewed, bounded JSON snapshot, not a general PDF parser or an automatic source publisher.
class ReviewedBookletImport
{
    private const SYSTEM = 'reviewed-booklet';

    public function preview(User $actor, string $file, string $pdf, string $evidence): ImportBatch
    {
        $this->authorize($actor);
        [$plan, $hash] = $this->load($file, $pdf, $evidence);
        $this->subjects($plan);
        $this->rule($plan, 'armed');
        $this->rule($plan, 'unarmed');
        $matches = $this->publishedIndex();
        $reusable = count(array_filter($plan['questions'], fn ($q) => count($matches[$this->fingerprint($q)] ?? []) === 1));
        $batch = new ImportBatch;
        $batch->forceFill([
            'source_system' => self::SYSTEM, 'source_name' => basename($file), 'source_sha256' => $hash,
            'adapter_version' => 'reviewed-json-1', 'plan_sha256' => $hash,
            'report' => ['education_type' => $plan['education_type'], 'exam_number' => $plan['exam_number'], 'exam_date' => $plan['exam_date'],
                'question_count' => 125, 'reusable_questions' => $reusable, 'new_question_candidates' => 125 - $reusable,
                'pdf_sha256' => $plan['pdf_sha256'], 'source_url' => $plan['source_url'], 'evidence_url' => $plan['evidence_url'],
                'verification' => ($plan['primary_source_verified'] ?? false) ? 'Official EGM A/B PDFs with reviewed content/answer and visual/subject comparison.' : (isset($plan['evidence_sha256']) ? 'Two source documents with reviewed content/answer comparison.' : 'Identical PDF bytes from two hosts, A/B answer comparison and visual/subject review.'),
                'evidence_sha256' => $plan['evidence_sha256'] ?? $plan['pdf_sha256'],
                'ab_matching_questions' => $plan['ab_matching_questions'], 'comparison_exceptions' => $plan['comparison_exceptions'] ?? [],
                'primary_source_verified' => $plan['primary_source_verified'] ?? false, 'subjects' => array_count_values(array_column($plan['questions'], 'subject_code'))],
            'status' => 'previewed', 'created_by' => $actor->id,
        ]);
        $batch->report_sha256 = $this->reportHash($batch->report);
        $batch->save();

        return $batch;
    }

    public function commit(User $actor, string $batchId, string $file, string $pdf, string $evidence, string $approval): array
    {
        [$plan, $hash] = $this->load($file, $pdf, $evidence);

        return DB::transaction(function () use ($actor, $batchId, $plan, $hash, $approval) {
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $this->authorize($actor);
            DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', [self::SYSTEM]);
            $batch = ImportBatch::whereKey($batchId)->lockForUpdate()->firstOrFail();
            if ($batch->source_system !== self::SYSTEM || $batch->source_sha256 !== $hash || $batch->plan_sha256 !== $hash
                || ! hash_equals($batch->report_sha256, $this->reportHash($batch->report))
                || ! hash_equals(substr($batch->report_sha256, 0, 12), $approval)) {
                throw new RuntimeException('Dosya veya onay kodu önizlemeyle eşleşmiyor.');
            }
            if ($batch->status === 'committed') {
                return $batch->report['result'];
            }
            if ($batch->status !== 'previewed') {
                throw new RuntimeException('Aktarım için yeni bir önizleme gerekir.');
            }
            $key = $plan['education_type'].':'.$plan['exam_number'].':'.$plan['exam_date'].':A';
            $existing = DB::table('import_records')->where(['source_system' => self::SYSTEM, 'source_table' => 'exam', 'source_key' => $key])->first();
            if ($existing) {
                $original = ImportBatch::findOrFail($existing->batch_id);
                if ($original->source_sha256 !== $hash) {
                    throw new RuntimeException('Bu sınav farklı bir onaylı içerikle aktarılmış; mevcut içerik ezilemez.');
                }
                $result = $original->report['result'];
            } else {
                $result = $this->apply($actor, $batch, $plan, $key);
            }
            $batch->forceFill(['status' => 'committed', 'approved_by' => $actor->id, 'approved_at' => now(), 'committed_at' => now(),
                'report' => $batch->report + ['result' => $result]])->save();
            DB::table('audit_events')->insert(['id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null, 'target_id' => $batch->id, 'action' => 'import.booklet_committed', 'created_at' => now()]);

            return $result;
        });
    }

    private function apply(User $actor, ImportBatch $batch, array $plan, string $key): array
    {
        $subjects = $this->subjects($plan);
        $type = ExamType::where('code', 'ogg-deneme')->firstOrFail();
        $label = $plan['education_type'] === 'renewal' ? 'Yenileme' : 'Temel';
        $title = 'Özel Güvenlik '.$plan['exam_number'].'. '.$label.' Eğitim Sınavı soruları';
        $source = QuestionSource::where('title', $title)->first();
        if (! $source) {
            $verification = ($plan['primary_source_verified'] ?? false)
                ? 'Asıl EGM A/B PDF dosyaları doğrudan indirildi; soru, seçenek, cevap ve ders eşlemesi incelendi. B kitapçığı: '
                : 'İki kaynak kopyası ve A/B cevapları karşılaştırıldı; soru görünümleri incelendi. Asıl EGM adresine erişilemediği için kaynak kopyası kullanıldı. İkinci kopya: ';
            $source = app(CreateCatalogEntry::class)->execute($actor, 'question-sources', ['title' => $title, 'url' => $plan['source_url'],
                'citation' => 'EGM '.$plan['exam_number'].'. '.$label.' Eğitim A kitapçığı, '.$plan['exam_date'].'. '.$verification.$plan['evidence_url']]);
        }
        $periods = [];
        foreach (['armed', 'unarmed'] as $weapon) {
            $rule = $this->rule($plan, $weapon);
            $period = ScoringPeriod::with('rule')->where('education_type', $plan['education_type'])->where('weapon_status', $weapon)->where('number', $plan['exam_number'])->first();
            if ($period && ($period->exam_date->format('Y-m-d') !== $plan['exam_date'] || $period->rule->id !== $rule->id)) {
                throw new RuntimeException('Mevcut dönem onaylı tarih/kural ile eşleşmiyor.');
            }
            $periods[$weapon] = $period ?? app(ManageScoring::class)->period($actor, ['scoring_rule_id' => $rule->id, 'number' => $plan['exam_number'], 'exam_date' => $plan['exam_date'], 'source_url' => $plan['source_url']]);
        }
        $index = $this->publishedIndex();
        $versions = [];
        $created = $reused = 0;
        foreach ($plan['questions'] as $q) {
            $fingerprint = $this->fingerprint($q);
            $matches = $index[$fingerprint] ?? [];
            if (count($matches) > 1) {
                throw new RuntimeException('Birden fazla aynı yayımlanmış soru var; eşleme açıkça çözümlenmeli.');
            }
            if ($matches) {
                $versions[] = $matches[0];
                $reused++;
            } else {
                $question = app(SaveQuestion::class)->execute($actor, ['subject_id' => $subjects[$q['subject_code']], 'source_id' => $source->id,
                    'stem' => $q['stem'], 'options' => $q['options'], 'correct_option_position' => $q['correct_option_position']]);
                $question = app(PublishQuestion::class)->execute($actor, $question, $question->revision);
                $versions[] = $question->published_version_id;
                $created++;
            }
        }
        $exam = app(SaveOfficialExam::class)->execute($actor, ['education_type' => $plan['education_type'], 'exam_type_id' => $type->id,
            'source_id' => $source->id, 'title' => 'ÖGG '.$plan['exam_number'].'. '.$label.' Deneme Sınavı — Silahlı',
            'year' => (int) substr($plan['exam_date'], 0, 4), 'term' => substr($plan['exam_date'], 5, 2), 'exam_number' => (string) $plan['exam_number'],
            'weapon_status' => 'armed', 'generate_unarmed' => true, 'scoring_period_id' => $periods['armed']->id, 'question_version_ids' => $versions]);
        $exam = app(PublishOfficialExam::class)->execute($actor, $exam);
        $child = OfficialExam::where('derived_from_id', $exam->id)->firstOrFail();
        DB::statement('SET CONSTRAINTS ALL IMMEDIATE');
        DB::table('import_records')->insert(['source_system' => self::SYSTEM, 'source_table' => 'exam', 'source_key' => $key,
            'batch_id' => $batch->id, 'target_type' => 'official_exam', 'target_id' => $exam->id, 'created_at' => now()]);

        return ['armed_exam_id' => $exam->id, 'unarmed_exam_id' => $child->id, 'created_questions' => $created, 'reused_questions' => $reused,
            'armed_questions' => 125, 'unarmed_questions' => 100, 'education_type' => $plan['education_type'], 'exam_number' => $plan['exam_number']];
    }

    private function load(string $file, string $pdf, string $evidence): array
    {
        if (! is_file($file) || filesize($file) > 4 * 1024 * 1024) {
            throw new RuntimeException('İncelenmiş JSON dosyası bulunamadı veya boyut sınırını aşıyor.');
        }
        $plan = json_decode(file_get_contents($file), true, 64, JSON_THROW_ON_ERROR);
        Validator::make($plan, [
            'education_type' => 'required|in:basic,renewal', 'exam_number' => 'required|integer|min:1|max:10000', 'exam_date' => 'required|date_format:Y-m-d',
            'source_url' => 'required|url:https|max:2048', 'evidence_url' => 'required|url:https|max:2048', 'pdf_sha256' => 'required|regex:/^[a-f0-9]{64}$/',
            'visual_reviewed' => 'required|accepted', 'subjects_reviewed' => 'required|accepted', 'ab_matching_questions' => 'required|integer|between:100,125',
            'comparison_exceptions' => 'sometimes|array|list|max:25', 'comparison_exceptions.*.position' => 'required|integer|distinct|between:1,125',
            'comparison_exceptions.*.reason' => 'required|string|min:20|max:2000',
            'evidence_sha256' => 'sometimes|required|regex:/^[a-f0-9]{64}$/', 'evidence_format' => 'required_with:evidence_sha256|in:pdf,doc',
            'primary_source_verified' => 'sometimes|boolean',
            'evidence_reviewed' => 'exclude_without:evidence_sha256|required|accepted', 'evidence_matching_questions' => 'required_with:evidence_sha256|integer|in:125',
            'scoring_rule_codes.armed' => 'required|string|max:80', 'scoring_rule_codes.unarmed' => 'required|string|max:80',
            'questions' => 'required|array|list|size:125', 'questions.*.position' => 'required|integer|distinct|between:1,125',
            'questions.*.subject_code' => 'required|string|max:80', 'questions.*.stem' => 'required|string|max:20000',
            'questions.*.options' => 'required|array|list|size:5', 'questions.*.options.*' => 'required|string|max:10000',
            'questions.*.correct_option_position' => 'required|integer|between:1,5',
        ])->validate();
        if ($plan['ab_matching_questions'] + count($plan['comparison_exceptions'] ?? []) !== 125) {
            throw new RuntimeException('A/B farklarının her biri ayrı inceleme notuyla açıklanmalı.');
        }
        if ($plan['primary_source_verified'] ?? false) {
            foreach (['source_url', 'evidence_url'] as $key) {
                $url = parse_url($plan[$key]);
                if (($url['scheme'] ?? '') !== 'https' || ! in_array($url['host'] ?? '', ['www.egm.gov.tr', 'egm.gov.tr'], true)
                    || isset($url['user']) || isset($url['pass']) || isset($url['port'])
                    || ! str_starts_with($url['path'] ?? '', '/kurumlar/egm.gov.tr/IcSite/ozelguvenlik/Sinav-Kitapcik/')) {
                    throw new RuntimeException('Asıl kaynak doğrulaması yalnız doğrudan EGM kitapçık adresleriyle yapılabilir.');
                }
            }
            if (($plan['evidence_format'] ?? null) !== 'pdf' || ! ($plan['evidence_reviewed'] ?? false)
                || ($plan['evidence_matching_questions'] ?? null) !== 125 || ! isset($plan['evidence_sha256'])
                || $plan['source_url'] === $plan['evidence_url'] || $plan['pdf_sha256'] === $plan['evidence_sha256']) {
                throw new RuntimeException('Asıl kaynak için farklı A/B PDF kanıtı ve 125 sorunun incelemesi gerekir.');
            }
        } elseif (parse_url($plan['source_url'], PHP_URL_HOST) === parse_url($plan['evidence_url'], PHP_URL_HOST)) {
            throw new RuntimeException('İkinci PDF farklı bir sunucudan gelmeli.');
        }
        foreach ([$pdf, $evidence] as $i => $path) {
            $magic = $i === 1 && ($plan['evidence_format'] ?? 'pdf') === 'doc' ? "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1" : '%PDF-';
            $hash = $i === 1 ? ($plan['evidence_sha256'] ?? $plan['pdf_sha256']) : $plan['pdf_sha256'];
            if (! is_file($path) || filesize($path) > 20 * 1024 * 1024 || file_get_contents($path, false, null, 0, strlen($magic)) !== $magic
                || ! hash_equals($hash, hash_file('sha256', $path))) {
                throw new RuntimeException('PDF kanıtı onaylı dosyayla aynı değil.');
            }
        }
        $seen = [];
        foreach ($plan['questions'] as $i => $q) {
            if ($q['position'] !== $i + 1 || count(array_unique(array_map($this->normalize(...), $q['options']))) !== 5
                || ($i >= 100 && $q['subject_code'] !== 'silah-bilgisi-ve-atis')) {
                throw new RuntimeException('Soru sırası, seçenekler veya silah bölümü eşlemesi geçersiz.');
            }
            $fingerprint = $this->fingerprint($q);
            if (isset($seen[$fingerprint])) {
                throw new RuntimeException('Aynı soru kitapçıkta iki kez var.');
            }
            $seen[$fingerprint] = true;
        }

        return [$plan, hash_file('sha256', $file)];
    }

    private function subjects(array $plan): array
    {
        $codes = array_unique(array_column($plan['questions'], 'subject_code'));
        $ids = Subject::whereIn('code', $codes)->pluck('id', 'code')->all();
        if (count($ids) !== count($codes)) {
            throw new RuntimeException('Onaylı derslerden biri katalogda yok.');
        }

        return $ids;
    }

    private function rule(array $plan, string $weapon): ScoringRule
    {
        $rule = ScoringRule::where('code', $plan['scoring_rule_codes'][$weapon])->where('education_type', $plan['education_type'])
            ->where('weapon_status', $weapon)->whereNotNull('published_at')->whereNull('archived_at')->orderByDesc('version')->firstOrFail();
        $config = $rule->configuration;
        if ($config['general_count'] !== 100 || $config['weapon_count'] !== ($weapon === 'armed' ? 25 : 0)
            || $plan['exam_number'] < $rule->period_from || $plan['exam_number'] > $rule->period_until
            || $plan['exam_date'] < $rule->effective_from->format('Y-m-d') || ($rule->effective_until && $plan['exam_date'] > $rule->effective_until->format('Y-m-d'))) {
            throw new RuntimeException('Doğrulanmış kural kitapçığın kapsamı/tarihi ile eşleşmiyor.');
        }

        return $rule;
    }

    private function publishedIndex(): array
    {
        $index = [];
        $subjects = Subject::pluck('code', 'id');
        foreach (Question::with('publishedVersion.options')->whereNotNull('published_version_id')->get() as $question) {
            $v = $question->publishedVersion;
            $code = $subjects[$v->subject_id] ?? null;
            $correct = $v->options->search(fn ($option) => $option->id === $v->correct_option_id);
            if ($correct === false) {
                continue;
            }
            $key = $this->fingerprint(['subject_code' => $code, 'stem' => $v->stem, 'options' => $v->options->pluck('text')->all(), 'correct_option_position' => $correct + 1]);
            $index[$key][] = $v->id;
        }

        return $index;
    }

    private function normalize(string $text): string
    {
        return trim(preg_replace('/\s+/u', ' ', $text));
    }

    private function reportHash(array $report): string
    {
        // Result is appended after approval; the reviewed snapshot remains hash-bound.
        unset($report['result']);

        return hash('sha256', json_encode(Arr::sortRecursive($report), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }

    private function fingerprint(array $question): string
    {
        return hash('sha256', json_encode([$question['subject_code'], $this->normalize($question['stem']), array_map($this->normalize(...), $question['options']), $question['correct_option_position']], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }

    private function authorize(User $actor): void
    {
        Gate::forUser($actor)->authorize('manage', Question::class);
        if ($actor->status !== 'active' || ! $actor->hasVerifiedEmail()) {
            throw new RuntimeException('Etkin ve doğrulanmış platform yöneticisi gerekir.');
        }
    }
}
