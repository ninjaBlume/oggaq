<?php

namespace App\Console\Commands;

use App\Support\PrivacyErasureLedger;
use Illuminate\Console\Command;

class ExportPrivacyErasures extends Command
{
    protected $signature = 'privacy:export-erasures {--to= : Korunan hedef dosya; verilmezse stdout}';

    protected $description = 'Hesap ve başvuru silme özetlerini şifreli yedeğe aktarılmak üzere dışa verir';

    public function handle(): int
    {
        $entries = PrivacyErasureLedger::entries();
        $data = implode("\n", array_map(fn ($row) => json_encode($row, JSON_THROW_ON_ERROR), $entries));
        $data = $data === '' ? '' : $data."\n";
        $target = $this->option('to');
        if (! $target) {
            $this->getOutput()->write($data);

            return self::SUCCESS;
        }
        $temp = tempnam(dirname($target), '.privacy-ledger-');
        if ($temp === false || ! chmod($temp, 0600) || file_put_contents($temp, $data) === false || ! rename($temp, $target)) {
            if ($temp) {
                @unlink($temp);
            }
            $this->error('Silme listesi yazılamadı.');

            return self::FAILURE;
        }
        $this->info('Yazılan kayıt: '.count($entries));

        return self::SUCCESS;
    }
}
