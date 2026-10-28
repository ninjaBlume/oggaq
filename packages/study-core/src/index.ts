export interface ExamClock {
  remainingMs: number;
  receivedAt: number;
}
// Device wall-clock changes never alter the server deadline. Presentation only;
// the API independently rejects late answers and returns the final result.
export function anchorClock(
  deadline: string,
  serverTime: string,
  monotonicNow: number,
): ExamClock {
  return {
    remainingMs: Math.max(0, Date.parse(deadline) - Date.parse(serverTime)),
    receivedAt: monotonicNow,
  };
}
export function remainingSeconds(
  clock: ExamClock,
  monotonicNow: number,
): number {
  return Math.max(
    0,
    Math.ceil(
      (clock.remainingMs - Math.max(0, monotonicNow - clock.receivedAt)) / 1000,
    ),
  );
}
export function timeLabel(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map((part) => part.toString().padStart(2, "0")).join(":");
}

// A question's exams are shown apart from its subject. The exam type is Deneme (a whole exam) or Ders (one subject's
// questions); armed/unarmed is a separate attribute: "107. Deneme · silahlı", "107. Ders · ÖZEL GÜVENLİK HUKU…".
// At most `limit` labels are listed plus a count.
export interface ExamMembership {
  exam_number: string | null;
  year: number;
  exam_type_name: string;
  subject_name?: string | null;
  weapon_status: 'armed' | 'unarmed' | null;
}
export const weaponLabels = { armed: 'silahlı', unarmed: 'silahsız' } as const;
export function examTypeShort(name: string): string {
  return name.replace(/\s+(Eğitimi?|Sınavı)$/i, '').trim();
}
// Date metadata in imported titles is omitted from display labels.
export function examDisplayTitle(title: string): string {
  return title.replace(/\s*\((?:\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}-\d{2}-\d{2})\)/gu, '').trim();
}
export function examAttemptTitle(exam: { official_exam: { title: string } | null; random_exam?: { title: string } | null; question_count: number }, fallback: 'deneme' | 'sınav' = 'deneme'): string {
  return exam.random_exam?.title ?? (exam.official_exam ? examDisplayTitle(exam.official_exam.title) : `${exam.question_count} soruluk ${fallback}`);
}
// List labels use explicit education metadata; renewal numbers are never derived
// from a basic exam number. Stored titles and historical attempts stay intact.
export function examQuestionTitle(exam: { exam_number: string | null; education_type?: 'basic' | 'renewal' | 'weapon_difference' }): string {
  const name = exam.education_type === 'renewal' ? 'Yenileme Eğitim Sınav Soruları'
    : exam.education_type === 'weapon_difference' ? 'Silah Farkı Sınav Soruları'
    : 'Temel Eğitim Sınav Soruları';
  const number = exam.exam_number?.trim();
  return number ? `${number}. ${name}` : name;
}
export { examPeriodLabel } from './exam-date';
export function examLabel(exam: ExamMembership): string {
  const subject = exam.subject_name ? (exam.subject_name.length > 24 ? `${exam.subject_name.slice(0, 23)}…` : exam.subject_name) : null;
  return [`${exam.exam_number ?? exam.year}. ${examTypeShort(exam.exam_type_name)}`, subject, exam.weapon_status ? weaponLabels[exam.weapon_status] : null].filter(Boolean).join(' · ');
}
export function examSummary(exams: readonly ExamMembership[], limit = 3): string {
  if (exams.length === 0) return 'Çıkmış sınavlarda yok';
  const shown = exams.slice(0, limit).map(examLabel).join(', ');
  return exams.length > limit ? `${shown} +${exams.length - limit}` : shown;
}

// EGM exam instruction 4.3: armed exam 150 minutes (125 questions), unarmed 120 (100), weapon-difference exam 30 (25).
// Subject exams use the same ratio of 1.2 minutes per question (the 25 weapon questions come out at 30), at least five
// minutes. A whole exam is one without a subject. The student may change the suggestion.
export function suggestedMinutes(exam: { subject: unknown; weapon_status: 'armed' | 'unarmed' | null; question_count: number }): number {
  if (!exam.subject && exam.weapon_status === 'armed') return 150;
  if (!exam.subject && exam.weapon_status === 'unarmed') return 120;
  return Math.max(5, Math.ceil(exam.question_count * 1.2));
}

// Result bands for colouring a score. The reference is the 60-point mark the written ÖGG exam asks for (silahsız: at
// least 60 of 100; silahlı: the average of the parts at least 60, EGM sınav talimatı); at 80 and above a result is
// strong. Only colour and tone follow the bands: the app never says "geçti" or "kaldı", the official result is not ours.
export type ScoreBand = 'strong' | 'steady' | 'weak';
export function scoreBand(percent: number): ScoreBand {
  return percent >= 80 ? 'strong' : percent >= 60 ? 'steady' : 'weak';
}

// The sentence that must be typed to delete an account; the server checks the same text (DeleteAccountRequest).
export const deleteAccountConfirmation = 'HESABIMI SİL';

// One vocabulary for all three apps. `title` heads a page and names a menu entry; `short` is for tab bars and other
// tight places. Nothing else names these places.
export const vocabulary = {
  home: { title: 'Ana sayfa', short: 'Ana sayfa' },
  deneme: { title: 'Deneme sınavları', short: 'Deneme', description: 'Geçmiş ÖGG sınavlarında çıkmış soruları özgün sırasıyla çöz. Silahlı sınav 125, silahsız sınav 100 sorudur.' },
  ders: { title: 'Ders sınavları', short: 'Ders', description: 'Çıkmış ÖGG sorularını derslerine göre çöz. Bir ders seçerek ilgili sınavlara ulaş.' },
  results: { title: 'Sonuçlarım', short: 'Sonuçlar' },
  review: { title: 'Tekrar sınavı', short: 'Tekrar' },
  random: { title: 'Rastgele sınav', short: 'Rastgele' },
  stats: { title: 'Başarı durumum', short: 'Başarım' },
  profile: { title: 'Profil', short: 'Profil' },
  reports: { title: 'Bildirimler', short: 'Bildirimler' },
  account: { title: 'Hesabım', short: 'Hesabım' },
  calendar: { title: 'Sınav takvimi', short: 'Takvim' },
  jobs: { title: 'İş İlanları', short: 'İş İlanları' },
} as const;

// crypto.randomUUID exists only in secure contexts (HTTPS or localhost); a development server opened over the LAN
// (http://192.168.x.x) has none. getRandomValues works everywhere, so this builds a v4 UUID from it when needed.
export function randomId(): string {
  const source = globalThis.crypto;
  if (typeof source.randomUUID === 'function') return source.randomUUID();
  const bytes = new Uint8Array(16);
  source.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Why a student can report a question (QuestionReportReason of the API), in the order the form lists them.
export const reportReasons = [
  { value: 'wrong_answer_key', label: 'Cevap anahtarı yanlış' },
  { value: 'typo', label: 'Yazım veya dil hatası' },
  { value: 'unclear', label: 'Soru anlaşılmıyor' },
  { value: 'outdated', label: 'Güncelliğini yitirmiş' },
  { value: 'other', label: 'Diğer' },
] as const;
export type ReportReason = (typeof reportReasons)[number]['value'];
export const reportNoteLimit = 500;
export const reportReasonLabel = (reason: string) => reportReasons.find((item) => item.value === reason)?.label ?? reason;

export { resumeQuestionIndex, ExamPositionSaver } from './exam-position';
export type { ExamPositionState } from './exam-position';
export { mergeExamAnswerState } from './exam-state';
export { jobStatusLabels, jobWeaponLabels, jobApplicationStatusLabels, jobApplicationNotice } from './jobs';

export * from './legal';
export { examTimerChoices, ExamTimerSession, mergeExamTimer } from './exam-timer';
export type { ExamTimerPolicy } from './exam-timer';
export { calendarDate, calendarDaysRemaining, orderedCalendarEntries, calendarYears, calendarToday, calendarPhase, calendarNotice, calendarStaleNotice } from './calendar';
export type { ExamCalendar, CalendarEntry } from './calendar';
export { upcomingCountdown, nextExamRefreshDelay } from './upcoming';
export type { UpcomingExam } from './upcoming';
export { calendarRules } from './calendar-rules';
export { displayPersonName, personInitials } from './person-name';
