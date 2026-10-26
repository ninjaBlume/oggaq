import { describe, expect, it } from 'vitest';
import { calendarDate, calendarPhase, calendarToday, calendarYears } from './calendar';
describe('exam calendar presentation', () => {
  it('uses the Turkish day across UTC midnight and never invents a time', () => {
    expect(calendarToday(new Date('2026-12-26T21:30:00Z'))).toBe('2026-12-27');
    expect(calendarDate('2026-12-27')).toBe('27 Aralık 2026 Pazar');
    expect(calendarDate('2026-12-27', false)).toBe('27 Aralık 2026');
    expect(calendarPhase('2026-12-27', '2026-12-26')).toBe('Yaklaşan sınav');
    expect(calendarPhase('2026-12-27', '2026-12-27')).toBe('Bugün');
    expect(calendarPhase('2026-12-27', '2026-12-28')).toBe('Sınav tarihi geçti');
  });
  it('shows stored years alongside current and next years without duplicates', () => {
    expect(calendarYears(undefined, 2026)).toEqual([2027,2026,2025]);
    expect(calendarYears({year:2026,years:[2024,2026],status:'ready',checked_at:null,verified_at:null,source_url:'https://example.test',entries:[]},2026)).toEqual([2027,2026,2025,2024]);
  });
});
