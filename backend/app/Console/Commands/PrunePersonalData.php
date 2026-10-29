<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PrunePersonalData extends Command
{
    protected $signature = 'privacy:prune {--force : Süresi dolan kayıtları sil; bu seçenek olmadan yalnız sayım yapar}';

    protected $description = 'Saklama politikasına göre sonuçlanmış başvuruları ve eski denetim kayıtlarını imha eder';

    private function applications(): Builder
    {
        $cutoff = now()->subDays(config('privacy.job_application_days'));

        return DB::table('job_applications as a')->join('job_postings as j', 'j.id', '=', 'a.job_posting_id')
            ->where(fn ($q) => $q->whereNull('a.retention_hold_until')->orWhere('a.retention_hold_until', '<=', now()))
            ->where(fn ($q) => $q
                ->where(fn ($q) => $q->whereIn('a.status', ['accepted', 'rejected'])->where('a.resolved_at', '<', $cutoff))
                ->orWhere(fn ($q) => $q->whereNotNull('j.closed_at')->where('j.status', '<>', 'published')->where('j.closed_at', '<', $cutoff))
                ->orWhere('j.expires_at', '<', $cutoff));
    }

    public function handle(): int
    {
        $counts = ['job_applications' => $this->applications()->count(),
            'audit_events' => DB::table('audit_events')->where('created_at', '<', now()->subYears(3))->count(),
            'account_erasures' => DB::table('account_erasures')->where('erased_at', '<', now()->subYears(3))->count()];
        if (! $this->option('force')) {
            $this->line('Hiçbir şey silinmedi. Aday kayıt sayıları: '.json_encode($counts));

            return self::SUCCESS;
        }
        $counts = array_fill_keys(array_keys($counts), 0);
        do {
            $deleted = DB::transaction(function () {
                // Lock both rows and recheck the predicate: reopening/review/holds cannot race the deletion.
                $ids = $this->applications()->orderBy('a.id')->limit(200)
                    ->lock('FOR UPDATE OF a, j SKIP LOCKED')->pluck('a.id');
                $count = DB::table('job_applications')->whereIn('id', $ids)->delete();
                if ($count > 0) {
                    $this->record(['job_applications' => $count, 'audit_events' => 0, 'account_erasures' => 0]);
                }

                return $count;
            }, 5);
            $counts['job_applications'] += $deleted;
        } while ($deleted > 0);
        DB::transaction(function () use (&$counts) {
            DB::statement("SET LOCAL oggaq.privacy_prune = 'on'");
            try {
                $counts['audit_events'] = DB::table('audit_events')->where('created_at', '<', now()->subYears(3))->delete();
                $counts['account_erasures'] = DB::table('account_erasures')->where('erased_at', '<', now()->subYears(3))->delete();
                DB::table('privacy_erasure_runs')->where('executed_at', '<', now()->subYears(3))->delete();
                if ($counts['audit_events'] + $counts['account_erasures'] > 0) {
                    $this->record(['job_applications' => 0, 'audit_events' => $counts['audit_events'], 'account_erasures' => $counts['account_erasures']]);
                }
            } finally {
                DB::statement("SET LOCAL oggaq.privacy_prune = 'off'");
            }
        });
        $this->line('İmha edilen kayıt sayıları: '.json_encode($counts));

        return self::SUCCESS;
    }

    private function record(array $counts): void
    {
        DB::table('privacy_erasure_runs')->insert($counts + [
            'id' => (string) Str::uuid(), 'policy_version' => config('privacy.policy_version'), 'executed_at' => now(),
        ]);
    }
}
