<?php

namespace App\Modules\Import\Commands;

use App\Models\User;
use App\Modules\Import\SubjectExamImport;
use App\Modules\QuestionBank\Models\OfficialExam;
use Illuminate\Console\Command;

class BookletSubjects extends Command
{
    protected $signature = 'import:booklet-subjects {exam} {--by=} {--approve= : Ders önizlemesinin onay kodu}';

    protected $description = 'Yayımlanmış kitapçığın sabit sorularından ders sınavlarını önizler veya onayla oluşturur.';

    public function handle(SubjectExamImport $import): int
    {
        $actor = User::where('email', mb_strtolower((string) $this->option('by')))->firstOrFail();
        $exam = OfficialExam::findOrFail($this->argument('exam'));
        $result = $this->option('approve') ? $import->commit($actor, $exam, $this->option('approve')) : $import->preview($actor, $exam);
        $this->line(json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));

        return self::SUCCESS;
    }
}
