<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Modules\Identity\AccountErasureLedger;
use App\Modules\Identity\Actions\DeleteAccount;
use App\Support\PrivacyErasureLedger;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ReapplyPrivacyErasures extends Command
{
    protected $signature = 'privacy:reapply-erasures {--from= : Yedekten daha yeni şifresi çözülmüş silme listesi} {--force : Varsayılan önizleme yerine silmeleri uygula}';

    protected $description = 'Yedekten dönen hesap ve tekil başvuruların önceki silmelerini yeniden uygular';

    public function handle(DeleteAccount $deletion): int
    {
        try {
            $external = $this->option('from') ? PrivacyErasureLedger::read($this->option('from')) : [];
        } catch (RuntimeException $error) {
            $this->error($error->getMessage());

            return self::FAILURE;
        }
        $entries = array_merge(PrivacyErasureLedger::entries(), $external);
        $hashes = ['account' => [], 'job_application' => []];
        foreach ($entries as $row) {
            $hashes[$row['scope']][$row['hash']] = true;
        }
        $counts = ['accounts' => 0, 'job_applications' => 0, 'protected_admins' => 0];
        DB::transaction(function () use ($deletion, $external, $hashes, &$counts) {
            if ($this->option('force')) {
                PrivacyErasureLedger::merge($external);
            }
            User::orderBy('id')->chunkById(200, function ($users) use ($deletion, $hashes, &$counts) {
                foreach ($users as $user) {
                    if (! isset($hashes['account'][AccountErasureLedger::hash($user->id)])) {
                        continue;
                    }
                    $locked = User::whereKey($user->id)->lockForUpdate()->first();
                    if (! $locked) {
                        continue;
                    }
                    if ($locked->platform_role === 'platform_admin') {
                        $counts['protected_admins']++;

                        continue;
                    }
                    $counts['accounts']++;
                    if ($this->option('force')) {
                        $deletion->erasePersonalData($locked);
                    }
                }
            });
            DB::table('job_applications')->orderBy('id')->chunkById(200, function ($rows) use ($hashes, &$counts) {
                foreach ($rows as $row) {
                    if (isset($hashes['job_application'][PrivacyErasureLedger::applicationHash($row->id)])) {
                        $counts['job_applications']++;
                        if ($this->option('force')) {
                            DB::table('job_applications')->where('id', $row->id)->delete();
                        }
                    }
                }
            });
            if ($this->option('force')) {
                PrivacyErasureLedger::proof($counts['job_applications']);
            }
        });
        $this->line(($this->option('force') ? 'Yeniden silinen' : 'Hiçbir şey silinmedi; aday').': '.json_encode($counts));

        return $counts['protected_admins'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
