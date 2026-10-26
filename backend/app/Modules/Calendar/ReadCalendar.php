<?php

namespace App\Modules\Calendar;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReadCalendar
{
    public function execute(int $year): array
    {
        $ready = Schema::hasTable('exam_calendar_sources');
        $source = $ready ? DB::table('exam_calendar_sources')->where('year', $year)->first() : null;
        $snapshot = $source?->active_snapshot_id ? DB::table('exam_calendar_snapshots')->find($source->active_snapshot_id) : null;
        $verified = $source?->verified_at ? CarbonImmutable::parse($source->verified_at) : null;

        return ['year' => $year,
            'years' => $ready ? DB::table('exam_calendar_sources')->whereNotNull('active_snapshot_id')->orderByDesc('year')->pluck('year')->all() : [],
            'status' => $snapshot === null ? 'unavailable' : ($source->status !== 'ready' || $verified->lessThan(now()->subHours(48)) ? 'stale' : 'ready'),
            'checked_at' => $source?->checked_at ? CarbonImmutable::parse($source->checked_at)->toISOString() : null,
            'verified_at' => $verified?->toISOString(), 'source_url' => SyncCalendarYear::url($year),
            'entries' => $snapshot ? json_decode($snapshot->entries, true, 32, JSON_THROW_ON_ERROR) : []];
    }
}
