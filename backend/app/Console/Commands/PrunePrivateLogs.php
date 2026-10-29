<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class PrunePrivateLogs extends Command
{
    protected $signature = 'privacy:prune-logs {--force : Varsayılan önizleme yerine süresi dolmuş günlükleri sil}';

    protected $description = 'Yalnız uygulamanın tarihli günlüklerini 14 günlük saklama sınırına göre temizler';

    public function handle(): int
    {
        $cutoff = now()->startOfDay()->subDays(13)->format('Y-m-d');
        $candidates = [];
        // One-time transition from an unbounded old single-file logger.
        $legacy = storage_path('logs/laravel.log');
        if ($this->option('force') && is_file($legacy) && ! is_link($legacy)) {
            $target = storage_path('logs/laravel-legacy-'.now()->format('Y-m-d').'.log');
            if (file_exists($target) || ! rename($legacy, $target)) {
                $this->error('Eski günlük sınırlı saklamaya taşınamadı; elle inceleyin.');

                return self::FAILURE;
            }
        }
        foreach (glob(storage_path('logs/laravel-*.log')) ?: [] as $file) {
            if (is_link($file) || ! is_file($file) || ! preg_match('/\Alaravel-(?:legacy-|emergency-)?(\d{4}-\d\d-\d\d)\.log\z/', basename($file), $match)) {
                continue;
            }
            if ($match[1] < $cutoff) {
                $candidates[] = $file;
            }
        }
        if ($this->option('force')) {
            foreach ($candidates as $file) {
                if (! unlink($file)) {
                    $this->error('Süresi dolan bir günlük silinemedi.');

                    return self::FAILURE;
                }
            }
        }
        $this->info(($this->option('force') ? 'Silinen günlük' : 'Hiçbir şey silinmedi; aday günlük').': '.count($candidates));

        return self::SUCCESS;
    }
}
