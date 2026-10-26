<?php

namespace Tests\Feature;

use App\Modules\Calendar\ParseEgmCalendar;
use App\Modules\Calendar\ReadCalendar;
use App\Modules\Calendar\SyncCalendarYear;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class ExamCalendarTest extends TestCase
{
    use RefreshDatabase;

    private function html(bool $second = true): string
    {
        return '<html><table><tr><th colspan="4">ÖZEL GÜVENLİK DENETLEME BAŞKANLIĞI 2026 YILI SINAV TAKVİMİ</th></tr><tr><td>SN</td><td>SINAVIN ADI</td><td>SINAV TARİHİ</td><td>EĞİTİM BİTİŞ TARİHİ</td></tr><tr><td>1</td><td>ÖZEL GÜVENLİK 901. TEMEL EĞİTİM VE 701. YENİLEME EĞİTİMİ SINAVI</td><td>22 Şubat 2026 Pazar</td><td>16 Ocak 2026 Cuma</td></tr>'.($second ? '<tr><td>2</td><td>ÖZEL GÜVENLİK 902. TEMEL EĞİTİM VE 702. YENİLEME EĞİTİMİ SINAVI</td><td>3 Mayıs 2026 Pazar</td><td>13 Mart 2026 Cuma</td></tr>' : '').'<tr><td>3</td><td>21. A SINIFI ATEŞLEYİCİ YETERLİLİK SINAVI</td><td>13 Aralık 2026 Pazar</td><td></td></tr></table></html>';
    }

    private function sync(): array
    {
        return app(SyncCalendarYear::class)->execute(2026);
    }

    public function test_sync_is_idempotent_and_only_stores_calendar_data(): void
    {
        Http::preventStrayRequests();
        Http::fake([SyncCalendarYear::url(2026) => Http::response($this->html())]);
        $first = $this->sync();
        $this->assertTrue($first['changed']);
        $this->assertSame(2, $first['count']);
        $this->assertFalse($this->sync()['changed']);
        $this->assertDatabaseCount('exam_calendar_snapshots', 1);
        $this->assertDatabaseCount('official_exams', 0);
        $this->assertDatabaseCount('questions', 0);
        $data = app(ReadCalendar::class)->execute(2026);
        $this->assertSame('ready', $data['status']);
        $this->assertSame(901, $data['entries'][0]['basic_number']);
        $this->assertSame(701, $data['entries'][0]['renewal_number']);
        $this->assertSame('2026-01-16', $data['entries'][0]['training_deadline']);
        Http::assertSent(fn ($r) => $r->url() === SyncCalendarYear::url(2026));
    }

    public function test_date_change_preserves_old_snapshot_and_failure_keeps_verified_data(): void
    {
        Http::fake([SyncCalendarYear::url(2026) => Http::sequence()->push($this->html())->push(str_replace('22 Şubat 2026 Pazar', '1 Mart 2026 Pazar', $this->html()))->push('unavailable', 503)->push('<html>Challenge</html>')]);
        $this->sync();
        $old = DB::table('exam_calendar_snapshots')->first();
        $this->assertTrue($this->sync()['changed']);
        $this->assertDatabaseCount('exam_calendar_snapshots', 2);
        $this->assertSame($old->entries, DB::table('exam_calendar_snapshots')->find($old->id)->entries);
        $data = app(ReadCalendar::class)->execute(2026);
        $this->assertSame('2026-03-01', $data['entries'][0]['exam_date']);
        $verified = $data['verified_at'];
        $this->travel(1)->hours();
        $this->assertSame('fetch_failed', $this->sync()['status']);
        $data = app(ReadCalendar::class)->execute(2026);
        $this->assertSame('stale', $data['status']);
        $this->assertSame($verified, $data['verified_at']);
        $this->assertSame('2026-03-01', $data['entries'][0]['exam_date']);
        $this->assertSame('invalid_source', $this->sync()['status']);
        $this->assertDatabaseCount('exam_calendar_snapshots', 2);
    }

    public function test_missing_or_changed_exam_pair_is_quarantined_instead_of_removed(): void
    {
        Http::fake([SyncCalendarYear::url(2026) => Http::sequence()->push($this->html())->push($this->html(false))->push(str_replace('701.', '700.', $this->html()))]);
        $this->sync();
        $this->assertSame('review_required', $this->sync()['status']);
        $this->assertSame('review_required', $this->sync()['status']);
        $this->assertDatabaseCount('exam_calendar_snapshots', 1);
        $this->assertCount(2, app(ReadCalendar::class)->execute(2026)['entries']);
    }

    public function test_student_reads_stored_calendar_without_fetching_and_guests_cannot(): void
    {
        Http::fake([SyncCalendarYear::url(2026) => Http::response($this->html())]);
        $this->sync();
        $this->getJson('/api/v1/exam-calendar?year=2026')->assertUnauthorized();
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/exam-calendar?year=2026')->assertOk()->assertJsonPath('data.status', 'ready')->assertJsonCount(2, 'data.entries');
        $this->getJson('/api/v1/exam-calendar?year=2101')->assertUnprocessable();
        $this->postJson('/api/v1/exam-calendar')->assertStatus(405);
        Http::assertSentCount(1);
        $this->travel(49)->hours();
        $this->getJson('/api/v1/exam-calendar?year=2026')->assertOk()->assertJsonPath('data.status', 'stale');
    }

    public function test_missing_year_and_unpublished_source_are_explicit_and_lock_prevents_overlap(): void
    {
        $this->assertSame('unavailable', app(ReadCalendar::class)->execute(2027)['status']);
        Http::fake([SyncCalendarYear::url(2027) => Http::response('', 404)]);
        $this->assertSame('not_published', app(SyncCalendarYear::class)->execute(2027)['status']);
        $lock = Cache::lock('exam-calendar:2026', 120);
        $lock->get();
        try {
            $this->assertSame('busy', $this->sync()['status']);
        } finally {
            $lock->release();
        }
        $this->artisan('calendar:sync', ['--year' => '2101'])->assertFailed();
    }

    public function test_parser_rejects_wrong_year_weekday_duplicates_and_ambiguous_or_incomplete_tables(): void
    {
        foreach ([str_replace('2026 YILI', '2027 YILI', $this->html()), str_replace('22 Şubat 2026 Pazar', '22 Şubat 2026 Salı', $this->html()), str_replace('902.', '901.', $this->html()), $this->html().$this->html(), str_replace('TEMEL EĞİTİM VE', 'TEMEL EĞİTİM', $this->html()), str_replace('16 Ocak 2026 Cuma', '3 Mayıs 2026 Pazar', $this->html())] as $html) {
            try {
                app(ParseEgmCalendar::class)->parse($html, 2026);
                $this->fail('Malformed source accepted');
            } catch (RuntimeException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_snapshot_cannot_be_changed_directly(): void
    {
        Http::fake([SyncCalendarYear::url(2026) => Http::response($this->html())]);
        $this->sync();
        $this->expectException(QueryException::class);
        DB::table('exam_calendar_snapshots')->update(['entries' => '[]']);
    }

    public function test_command_runs_and_has_a_daily_turkey_schedule(): void
    {
        Http::fake([SyncCalendarYear::url(2026) => Http::response($this->html())]);
        $this->artisan('calendar:sync', ['--year' => '2026'])->assertSuccessful();
        $events = collect(app(Schedule::class)->events())->filter(fn ($event) => str_contains($event->command ?? '', 'calendar:sync'));
        $this->assertCount(1, $events);
        $this->assertSame('20 3 * * *', $events->first()->expression);
        $this->assertSame('Europe/Istanbul', $events->first()->timezone);
    }

    public function test_snapshot_of_another_year_cannot_be_selected(): void
    {
        Http::fake([SyncCalendarYear::url(2026) => Http::response($this->html())]);
        $this->sync();
        $snapshot = DB::table('exam_calendar_snapshots')->first();
        $this->expectException(QueryException::class);
        DB::table('exam_calendar_sources')->insert(['year' => 2027, 'source_url' => SyncCalendarYear::url(2027), 'active_snapshot_id' => $snapshot->id, 'verified_at' => now()]);
    }

    public function test_protected_local_database_without_migration_is_readable_and_never_polled(): void
    {
        $migration = require database_path('migrations/2026_10_26_000004_create_exam_calendar.php');
        $migration->down();
        Http::fake();
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/exam-calendar?year=2026')->assertOk()->assertJsonPath('data.status', 'unavailable')->assertJsonCount(0, 'data.entries');
        $this->artisan('calendar:sync', ['--year' => '2026'])->assertFailed();
        Http::assertNothingSent();
    }
}
