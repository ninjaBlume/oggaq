<?php

namespace Tests\Feature;

use App\Modules\Calendar\ReadCalendar;
use App\Modules\Calendar\SyncCalendarYear;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class UpcomingExamTest extends TestCase
{
    use RefreshDatabase;

    private function calendar(int $year, array $dates, string $status = 'ready'): void
    {
        $id = (string) Str::uuid();
        $entries = array_map(fn ($date, $i) => ['basic_number' => 901 + $i, 'renewal_number' => 701 + $i, 'exam_date' => $date, 'training_deadline' => CarbonImmutable::parse($date)->subDays(20)->toDateString()], $dates, array_keys($dates));
        DB::table('exam_calendar_sources')->insert(['year' => $year, 'source_url' => SyncCalendarYear::url($year)]);
        DB::table('exam_calendar_snapshots')->insert(['id' => $id, 'year' => $year, 'entries' => json_encode($entries), 'content_hash' => hash('sha256', json_encode($entries)), 'created_at' => now()]);
        DB::table('exam_calendar_sources')->where('year', $year)->update(['active_snapshot_id' => $id, 'verified_at' => now(), 'checked_at' => now(), 'status' => $status]);
    }

    public function test_next_date_ignores_past_and_counts_calendar_days_in_turkey(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-26T12:00:00Z'));
        $this->calendar(2026, ['2026-10-24', '2026-12-27']);
        Http::fake();
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/exam-calendar/next')->assertOk()->assertJsonPath('data.entry.exam_date', '2026-12-27')->assertJsonPath('data.entry.basic_number', 902)->assertJsonPath('data.days_remaining', 62)->assertJsonPath('data.status', 'ready')->assertJsonPath('data.today', '2026-10-26');
        Http::assertNothingSent();
    }

    public function test_exam_day_is_zero_then_next_year_is_selected_after_turkey_midnight(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-12-26T21:30:00Z'));
        $this->calendar(2026, ['2026-12-27']);
        $this->calendar(2027, ['2027-01-10']);
        $this->assertSame(0, app(ReadCalendar::class)->next()['days_remaining']);
        $this->travelTo(CarbonImmutable::parse('2026-12-27T21:00:00Z'));
        $result = app(ReadCalendar::class)->next();
        $this->assertSame('2026-12-28', $result['today']);
        $this->assertSame('2027-01-10', $result['entry']['exam_date']);
        $this->assertSame(13, $result['days_remaining']);
        $this->assertSame('ready', $result['status']);
    }

    public function test_stale_earlier_exam_is_kept_with_a_warning(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-26T12:00:00Z'));
        $this->calendar(2026, ['2026-12-27'], 'fetch_failed');
        $this->calendar(2027, ['2027-01-10']);
        $result = app(ReadCalendar::class)->next();
        $this->assertSame('2026-12-27', $result['entry']['exam_date']);
        $this->assertSame('stale', $result['status']);
    }

    public function test_missing_current_year_does_not_claim_next_year_is_fully_current(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-12-28T12:00:00Z'));
        $this->calendar(2027, ['2027-01-10']);
        $this->assertSame('stale', app(ReadCalendar::class)->next()['status']);
        $this->travel(49)->hours();
        $this->assertSame('stale', app(ReadCalendar::class)->next()['status']);
    }

    public function test_no_known_future_date_is_explicit_and_missing_local_schema_is_safe(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-12-28T12:00:00Z'));
        $this->getJson('/api/v1/exam-calendar/next')->assertUnauthorized();
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/exam-calendar/next')->assertOk()->assertJsonPath('data.entry', null)->assertJsonPath('data.days_remaining', null)->assertJsonPath('data.status', 'unavailable');
        $migration = require database_path('migrations/2026_10_26_000004_create_exam_calendar.php');
        $migration->down();
        $this->getJson('/api/v1/exam-calendar/next')->assertOk()->assertJsonPath('data.status', 'unavailable');
    }
}
