import { describe, expect, it } from 'vitest';
import { calendarDate, calendarDaysRemaining, calendarPhase, calendarToday, calendarYears, orderedCalendarEntries } from './calendar';
describe('exam calendar presentation', () => {
  it('uses the Turkish day across UTC midnight and never invents a time', () => {
    expect(calendarToday(new Date('2026-12-26T21:30:00Z'))).toBe('2026-12-27');
    expect(calendarDate('2026-12-27')).toBe('27 Aralık 2026 Pazar');
    expect(calendarDate('2026-12-27', false)).toBe('27 Aralık 2026');
    expect(calendarPhase('2026-12-27', '2026-12-26')).toBe('Yaklaşan sınav');
    expect(calendarPhase('2026-12-27', '2026-12-27')).toBe('Bugün');
    expect(calendarPhase('2026-12-27', '2026-12-28')).toBe('Sınav tarihi geçti');
  });
  it('counts calendar days across year and leap-day boundaries, with today and past states', () => {
    expect(calendarDaysRemaining('2027-01-01', '2026-12-31')).toBe(1);
    expect(calendarDaysRemaining('2028-03-01', '2028-02-28')).toBe(2);
    expect(calendarDaysRemaining('2026-12-27', '2026-12-27')).toBe(0);
    expect(calendarDaysRemaining('2026-12-26', '2026-12-27')).toBeNull();
  });
  it('places upcoming dates first and recent past dates next, without reordering source data', () => {
    const entries = ['2026-02-01', '2026-12-27', '2026-10-24', '2026-11-01'].map((exam_date, index) => ({ exam_date, training_deadline: '2026-01-01', basic_number: index + 1, renewal_number: index + 100 }));
    expect(orderedCalendarEntries(entries, '2026-10-26').map(entry => entry.exam_date)).toEqual(['2026-11-01', '2026-12-27', '2026-10-24', '2026-02-01']);
    expect(orderedCalendarEntries(entries, '2026-12-28').map(entry => entry.exam_date)).toEqual(['2026-12-27', '2026-11-01', '2026-10-24', '2026-02-01']);
    expect(entries[0].exam_date).toBe('2026-02-01');
  });
  it('shows stored years alongside current and next years without duplicates', () => {
    expect(calendarYears(undefined, 2026)).toEqual([2027,2026,2025]);
    expect(calendarYears({year:2026,years:[2024,2026],status:'ready',checked_at:null,verified_at:null,source_url:'https://example.test',entries:[]},2026)).toEqual([2027,2026,2025,2024]);
  });
});
