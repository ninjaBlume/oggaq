<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Modules\Identity\AccountErasureLedger;
use App\Modules\Identity\Actions\DeleteAccount;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ReapplyAccountErasures extends Command
{
    protected $signature = 'accounts:reapply-erasures {--from= : accounts:export-erasures çıktısı; yedekten daha yeni silmeleri ekler} {--force : Bulunan hesapları gerçekten siler (varsayılan yalnız sayar)}';

    protected $description = 'Yedekten geri yüklenmiş veritabanında, önceden silinmiş hesapları tekrar siler.';

    public function handle(DeleteAccount $deletion): int
    {
        $fromFile = [];
        if ($from = $this->option('from')) {
            if (! is_readable($from)) {
                $this->error('Silme listesi dosyası okunamadı.');

                return self::FAILURE;
            }
            try {
                $fromFile = AccountErasureLedger::parse(collect(file($from, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES))->map(fn ($line) => json_decode($line, true)));
            } catch (RuntimeException $exception) {
                $this->error($exception->getMessage());

                return self::FAILURE;
            }
            // The database ledger only changes with --force; a count never writes anything.
            if ($this->option('force')) {
                $this->info('Listeye eklenen yeni kayıt: '.AccountErasureLedger::merge($fromFile));
            } else {
                $this->info('Dosyadan okunan kayıt: '.count($fromFile).' (listeye yalnızca --force ile eklenir)');
            }
        }
        $erased = array_flip(DB::table('account_erasures')->pluck('user_hash')->all()) + array_map(fn () => 0, $fromFile);
        $found = [];
        User::query()->select('id', 'platform_role')->orderBy('id')->chunk(500, function ($users) use ($erased, &$found) {
            foreach ($users as $user) {
                if (isset($erased[AccountErasureLedger::hash($user->id)])) {
                    $found[] = $user;
                }
            }
        });
        $this->info('Listede olup veritabanında geri gelmiş hesap: '.count($found));
        if ($found === [] || ! $this->option('force')) {
            if ($found !== []) {
                $this->warn('Hiçbir şey silinmedi. Silmek için --force ekleyin.');
            }

            return self::SUCCESS;
        }
        $deleted = 0;
        $skipped = 0;
        foreach ($found as $user) {
            // A platform admin cannot erase themselves through the app, so one on the list means something is wrong: never delete automatically.
            if ($user->platform_role === 'platform_admin') {
                $skipped++;

                continue;
            }
            DB::transaction(function () use ($deletion, $user) {
                $locked = User::whereKey($user->id)->lockForUpdate()->first();
                if ($locked) {
                    $deletion->erasePersonalData($locked);
                }
            });
            $deleted++;
        }
        $this->info("Silinen hesap: {$deleted}");
        if ($skipped > 0) {
            $this->error("Atlanan platform yöneticisi hesabı: {$skipped}. Elle incelenmeli.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
