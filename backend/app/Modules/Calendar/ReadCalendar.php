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

    public function next(): array
    {
        $now = CarbonImmutable::now('Europe/Istanbul');
        $today = $now->startOfDay();
        $result = ['server_time' => $now->toISOString(), 'today' => $today->toDateString(), 'status' => 'unavailable', 'entry' => null, 'days_remaining' => null, 'source_url' => null, 'verified_at' => null];
        if (! Schema::hasTable('exam_calendar_sources')) {
            return $result;
        }
        $sources = DB::table('exam_calendar_sources as s')->join('exam_calendar_snapshots as v', function ($join) {
            $join->on('s.active_snapshot_id', '=', 'v.id')->on('s.year', '=', 'v.year');
        })->whereBetween('s.year', [$now->year, min(2100, $now->year + 1)])->select('s.year', 's.status', 's.source_url', 's.verified_at', 'v.entries')->get();
        $candidates = [];
        foreach ($sources as $source) {
            foreach (json_decode($source->entries, true, 32, JSON_THROW_ON_ERROR) as $entry) {
                if ($entry['exam_date'] >= $result['today']) {
                    $candidates[] = ['source' => $source, 'entry' => $entry];
                }
            }
        }
        usort($candidates, fn ($a, $b) => strcmp($a['entry']['exam_date'], $b['entry']['exam_date']));
        if (! $candidates) {
            return $result;
        }
        ['source' => $source, 'entry' => $entry] = $candidates[0];
        $verified = CarbonImmutable::parse($source->verified_at);
        // A following-year date may be known while the current-year calendar is missing.
        $current = $sources->first(fn ($s) => $s->year === $now->year);
        $currentYearKnown = $source->year === $now->year || ($current && $current->status === 'ready' && CarbonImmutable::parse($current->verified_at)->greaterThanOrEqualTo($now->subHours(48)));
        $fresh = $source->status === 'ready' && $verified->greaterThanOrEqualTo($now->subHours(48)) && $currentYearKnown;

        return [...$result, 'status' => $fresh ? 'ready' : 'stale', 'entry' => $entry,
            'days_remaining' => (int) $today->diffInDays(CarbonImmutable::parse($entry['exam_date'], 'Europe/Istanbul')->startOfDay()),
            'source_url' => $source->source_url, 'verified_at' => $verified->toISOString()];
    }
}
