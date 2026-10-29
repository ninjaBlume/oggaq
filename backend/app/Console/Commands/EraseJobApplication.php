<?php

namespace App\Console\Commands;

use App\Support\PrivacyErasureLedger;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EraseJobApplication extends Command
{
    protected $signature = 'privacy:erase-application {application : Kimliği doğrulanmış talebin başvuru UUID’si} {--force : Önizleme yerine sil}';

    protected $description = 'İlgili kişinin talebi incelendikten sonra yalnız belirtilen başvuruyu siler';

    public function handle(): int
    {
        $id = $this->argument('application');
        if (! Str::isUuid($id)) {
            $this->error('Geçerli bir başvuru UUID’si gerekli.');

            return self::FAILURE;
        }

        return DB::transaction(function () use ($id) {
            $application = DB::table('job_applications')->where('id', $id)->lockForUpdate()->first();
            if (! $application) {
                $this->info('Başvuru mevcut değil; değişiklik yapılmadı.');

                return self::SUCCESS;
            }
            if ($application->retention_hold_until && now()->lt($application->retention_hold_until)) {
                $this->error('Aktif hukuki saklama ertelemesi var; önce gerekçeli değerlendirme gerekiyor.');

                return self::FAILURE;
            }
            if (! $this->option('force')) {
                $this->info('Hiçbir şey silinmedi. Aday başvuru: 1');

                return self::SUCCESS;
            }
            PrivacyErasureLedger::recordApplication($id);
            DB::table('job_applications')->where('id', $id)->delete();
            PrivacyErasureLedger::proof(1);
            $this->info('Başvuru silindi; hesap ve sınav geçmişi korundu.');

            return self::SUCCESS;
        });
    }
}
