<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExportAccountErasures extends Command
{
    protected $signature = 'accounts:export-erasures {--to= : Dosya yolu; verilmezse standart çıktıya yazılır}';

    protected $description = 'Silinmiş hesapların anahtarlı özetlerini (kişi bilgisi içermez) yedekten ayrı saklanmak üzere yazar.';

    public function handle(): int
    {
        $lines = DB::table('account_erasures')->orderBy('erased_at')->orderBy('user_hash')->get()
            ->map(fn ($row) => json_encode(['user_hash' => $row->user_hash, 'erased_at' => Carbon::parse($row->erased_at)->utc()->toIso8601String()]))->implode("\n");
        $lines = $lines === '' ? '' : $lines."\n";
        $target = $this->option('to');
        if ($target === null || $target === '') {
            $this->getOutput()->write($lines);

            return self::SUCCESS;
        }
        // Written beside the target and moved into place: a half-written file never replaces a good one.
        $temporary = $target.'.tmp'.getmypid();
        if (file_put_contents($temporary, $lines) === false || ! chmod($temporary, 0640) || ! rename($temporary, $target)) {
            @unlink($temporary);
            $this->error('Silme listesi yazılamadı.');

            return self::FAILURE;
        }
        $this->info('Yazılan kayıt: '.substr_count($lines, "\n"));

        return self::SUCCESS;
    }
}
