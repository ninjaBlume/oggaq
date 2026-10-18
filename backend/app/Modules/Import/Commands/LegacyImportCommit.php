<?php

namespace App\Modules\Import\Commands;

use App\Models\User;
use App\Modules\Import\ImportBatch;
use App\Modules\Import\LegacyImport;
use Illuminate\Console\Command;

class LegacyImportCommit extends Command
{
    protected $signature = 'import:legacy-commit {batch} {file} {--approve= : Önizleme raporunun onay kodu} {--by= : Onaylayan platform yöneticisinin e-postası}';

    protected $description = 'Onaylanmış önizlemeyi yayımlanmış merkezi içerik olarak aktarır; tekrar çalıştırmak içeriği çoğaltmaz.';

    public function handle(LegacyImport $import): int
    {
        ini_set('memory_limit', '1G');
        $batch = ImportBatch::findOrFail($this->argument('batch'));
        $approver = User::where('email', mb_strtolower((string) $this->option('by')))->first();
        if ($approver === null) {
            $this->error('Onaylayan yönetici bulunamadı.');

            return self::FAILURE;
        }
        try {
            $created = $import->commit($batch, $this->argument('file'), (string) $this->option('approve'), $approver);
        } catch (\RuntimeException $error) {
            $this->error($error->getMessage());

            return self::FAILURE;
        }
        $this->info(sprintf('Aktarıldı: %d ders, %d kaynak, %d yayımlanmış + %d taslak soru, %d yayımlanmış + %d taslak çıkmış sınav.', $created['subjects'], $created['sources'], $created['questions'], $created['draft_questions'], $created['exams'], $created['draft_exams']));

        return self::SUCCESS;
    }
}
