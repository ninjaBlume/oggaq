import type { components } from '@oggaq/shared-types';
import { calendarToday } from './calendar';
export type UpcomingExam = components['schemas']['UpcomingExam'];
export function upcomingCountdown(days: number) {
  return days === 0 ? 'Bugün' : `${days.toLocaleString('tr-TR')} gün kaldı`;
}
// Refresh at least every five minutes while visible, or just after Turkey midnight, using the server clock.
export function nextExamRefreshDelay(serverTime?: string) {
  const timestamp = serverTime ? Date.parse(serverTime) : NaN;
  if (!Number.isFinite(timestamp)) return 300000;
  const midnight = Date.parse(`${calendarToday(new Date(timestamp))}T00:00:00+03:00`) + 86400000;
  return Math.min(300000, Math.max(1000, midnight - timestamp + 250));
}
