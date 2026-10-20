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
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
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
