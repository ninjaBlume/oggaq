import { describe, expect, it } from 'vitest';
import { nextExamRefreshDelay, upcomingCountdown } from './upcoming';
describe('upcoming exam countdown', () => {
  it('uses days without a false zero-day countdown on exam day', () => {
    expect(upcomingCountdown(0)).toBe('Bugün');expect(upcomingCountdown(1)).toBe('1 gün kaldı');expect(upcomingCountdown(62)).toBe('62 gün kaldı');
  });
  it('refreshes at Turkey midnight using server time, capped at five minutes', () => {
    expect(nextExamRefreshDelay('2026-12-26T20:59:58Z')).toBe(2250);
    expect(nextExamRefreshDelay('2026-12-26T12:00:00Z')).toBe(300000);
    expect(nextExamRefreshDelay()).toBe(300000);
  });
});
