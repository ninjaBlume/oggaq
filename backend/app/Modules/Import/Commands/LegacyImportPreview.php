<?php

namespace App\Modules\Import\Commands;

use App\Modules\Import\LegacyImport;
use Illuminate\Console\Command;

class LegacyImportPreview extends Command
{
    protected $signature = 'import:legacy-preview {file : MySQL dökümü; yalnız ders/sınav/soru/yanıt tabloları okunur}';

    protected $description = 'Kaynak dökümü çalıştırmadan çözümler, doğrular ve onay kodlu önizleme raporu üretir; içerik oluşturmaz.';

    public function handle(LegacyImport $import): int
    {
        ini_set('memory_limit', '1G');
        $batch = $import->preview($this->argument('file'));
        $report = $batch->report;
        $this->info("Önizleme hazır: {$batch->id}");
        $this->line("Benzersiz soru: {$report['stats']['unique_questions']} / kaynak {$report['stats']['source_questions']} · taslak kalacak (eksik): {$report['stats']['incomplete']} · reddedilen: {$report['stats']['rejected']} · tekrar: {$report['stats']['duplicates']} · ders setinde ezilen: {$report['stats']['superseded']}");
        $draftExams = count(array_filter($report['exams'], fn ($exam) => ! $exam['publishable']));
        $this->line('Çıkmış sınav: '.count($report['exams'])." (taslak kalacak: {$draftExams}) · hata: ".count($report['errors']));
        $this->line('Raporun tamamı veritabanında (import_batches.report). Onay kodu: '.substr($batch->report_sha256, 0, 12));

        return self::SUCCESS;
    }
}
