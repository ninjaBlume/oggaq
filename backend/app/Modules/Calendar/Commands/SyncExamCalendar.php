<?php

namespace App\Modules\Calendar\Commands;

use App\Modules\Calendar\SyncCalendarYear;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class SyncExamCalendar extends Command
{
    protected $signature = 'calendar:sync {--year= : Yalnız bu yılı kontrol et}';

    protected $description = 'EGM Temel/Yenileme takvimini doğrular; değişmez kaynak sürümlerini saklar.';

    public function handle(SyncCalendarYear $sync): int
    {
        $option = $this->option('year');
        if ($option !== null && (! ctype_digit($option) || (int) $option < 2020 || (int) $option > 2100)) {
            $this->error('Geçersiz yıl.');

            return self::FAILURE;
        }
        if (! Schema::hasTable('exam_calendar_sources')) {
            $this->warn('Takvim migration bekliyor; kaynak sorgulanmadı.');

            return self::FAILURE;
        }
        $year = now('Europe/Istanbul')->year;
        $failed = false;
        foreach ($option !== null ? [(int) $option] : [$year, $year + 1] as $year) {
            $result = $sync->execute($year);
            $this->line(json_encode($result, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
            $failed = $failed || in_array($result['status'], ['fetch_failed', 'invalid_source', 'review_required'], true);
        }

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
