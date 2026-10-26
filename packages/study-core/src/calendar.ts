import type { components } from '@oggaq/shared-types';
export type ExamCalendar = components['schemas']['ExamCalendar'];
export type CalendarEntry = components['schemas']['ExamCalendarEntry'];
export const calendarNotice = 'Tarihler EGM’nin yayımladığı takvimden alınır. Başvuru ve sınav duyurularını resmî kaynaktan takip et.';
export const calendarStaleNotice = 'Takvim güncellenemedi veya son kontrolün üzerinden zaman geçti. Son doğrulanmış tarihler gösteriliyor.';
export function calendarDate(value: string, includeWeekday = true) {
  return new Date(`${value}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: includeWeekday ? 'long' : undefined, timeZone: 'Europe/Istanbul' });
}
export function calendarYears(calendar: ExamCalendar | undefined, current: number) {
  return [...new Set([current - 1, current, current + 1, ...(calendar?.years ?? [])])].filter(year => year >= 2020 && year <= 2100).sort((a, b) => b - a);
}
export function calendarToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
export function calendarPhase(date: string, today = calendarToday()) {
  return date < today ? 'Sınav tarihi geçti' : date === today ? 'Bugün' : 'Yaklaşan sınav';
}
