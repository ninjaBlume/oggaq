<?php

namespace App\Modules\Import\Commands;

use App\Models\User;
use App\Modules\Import\ReviewedBookletImport;
use Illuminate\Console\Command;

class ReviewedBooklet extends Command
{
    protected $signature = 'import:booklet {file} {pdf} {evidence} {--by= : Onaylayan platform yöneticisi} {--commit= : Önizleme batch kimliği} {--approve= : Rapor onay kodu}';

    protected $description = 'İncelenmiş kitapçık JSON/PDF kanıtını önizler; yalnız onay koduyla aynı snapshotı aktarır.';

    public function handle(ReviewedBookletImport $import): int
    {
        $actor = User::where('email', mb_strtolower((string) $this->option('by')))->firstOrFail();
        if ($this->option('commit')) {
            $result = $import->commit($actor, $this->option('commit'), $this->argument('file'), $this->argument('pdf'), $this->argument('evidence'), (string) $this->option('approve'));
            $this->line(json_encode(['committed' => true, 'result' => $result], JSON_THROW_ON_ERROR));
        } else {
            $batch = $import->preview($actor, $this->argument('file'), $this->argument('pdf'), $this->argument('evidence'));
            $this->line(json_encode(['batch' => $batch->id, 'approval' => substr($batch->report_sha256, 0, 12), 'report' => $batch->report], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        }

        return self::SUCCESS;
    }
}
