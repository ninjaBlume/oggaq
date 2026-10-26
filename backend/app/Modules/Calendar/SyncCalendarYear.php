<?php

namespace App\Modules\Calendar;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class SyncCalendarYear
{
    public static function url(int $year): string
    {
        if ($year < 2020 || $year > 2100) {
            throw new RuntimeException('Invalid calendar year');
        }

        return 'https://www.egm.gov.tr/ozelguvenlik/'.$year.'-sinav-takvimi';
    }

    public function execute(int $year): array
    {
        $url = self::url($year);
        $lock = Cache::lock('exam-calendar:'.$year, 120);
        if (! $lock->get()) {
            return ['year' => $year, 'status' => 'busy', 'changed' => false];
        }
        try {
            DB::table('exam_calendar_sources')->insertOrIgnore(['year' => $year, 'source_url' => $url]);
            try {
                $response = Http::withHeaders(['User-Agent' => 'OggSorCalendar/1.0 (+https://oggsor.com)', 'Accept' => 'text/html'])->connectTimeout(5)->timeout(15)->withoutRedirecting()->withOptions(['stream' => true])->get($url);
                if (! $response->successful()) {
                    // EGM returns this fixed relative error redirect for an unpublished year. Never follow it.
                    $notPublished = $response->status() === 404 || ($response->status() === 302 && $response->header('Location') === '/Hata/Page404');

                    return $this->failed($year, $notPublished ? 'not_published' : 'fetch_failed');
                }
                $body = $response->toPsrResponse()->getBody();
                if ($body->isSeekable()) {
                    $body->rewind();
                }
                $html = '';
                while (! $body->eof()) {
                    $html .= $body->read(16384);
                    if (strlen($html) > 1048576) {
                        throw new RuntimeException('Calendar response too large');
                    }
                }
            } catch (Throwable) {
                return $this->failed($year, 'fetch_failed');
            }
            try {
                $entries = app(ParseEgmCalendar::class)->parse($html, $year);
            } catch (Throwable) {
                return $this->failed($year, 'invalid_source');
            }

            return DB::transaction(function () use ($year, $entries) {
                $source = DB::table('exam_calendar_sources')->where('year', $year)->lockForUpdate()->first();
                $previous = $source->active_snapshot_id ? DB::table('exam_calendar_snapshots')->find($source->active_snapshot_id) : null;
                if ($previous) {
                    $old = json_decode($previous->entries, true, 32, JSON_THROW_ON_ERROR);
                    $keys = fn ($rows) => array_map(fn ($r) => $r['basic_number'].':'.$r['renewal_number'], $rows);
                    if (array_diff($keys($old), $keys($entries))) {
                        return $this->failed($year, 'review_required');
                    }
                }
                $hash = hash('sha256', json_encode($entries, JSON_THROW_ON_ERROR));
                $snapshot = DB::table('exam_calendar_snapshots')->where('year', $year)->where('content_hash', $hash)->first();
                if (! $snapshot) {
                    $id = (string) Str::uuid();
                    DB::table('exam_calendar_snapshots')->insert(['id' => $id, 'year' => $year, 'content_hash' => $hash, 'entries' => json_encode($entries, JSON_THROW_ON_ERROR), 'created_at' => now()]);
                } else {
                    $id = $snapshot->id;
                }
                DB::table('exam_calendar_sources')->where('year', $year)->update(['active_snapshot_id' => $id, 'status' => 'ready', 'checked_at' => now(), 'verified_at' => now()]);

                return ['year' => $year, 'status' => 'ready', 'changed' => $source->active_snapshot_id !== $id, 'count' => count($entries)];
            });
        } finally {
            $lock->release();
        }
    }

    private function failed(int $year, string $status): array
    {
        DB::table('exam_calendar_sources')->where('year', $year)->update(['status' => $status, 'checked_at' => now()]);

        return ['year' => $year, 'status' => $status, 'changed' => false];
    }
}
