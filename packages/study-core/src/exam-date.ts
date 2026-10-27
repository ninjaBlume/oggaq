const monthLabels = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'] as const;

type ExamDateMetadata = {
  term: string | null;
  year: number;
  title?: string;
  exam_number?: string | null;
  education_type?: 'basic' | 'renewal' | 'weapon_difference';
  source?: { citation?: string | null } | null;
};

function calendarDay(value: string): { day: number; month: number; year: number } | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const local = /^(\d{1,2})([./-])(\d{1,2})\2(\d{4})$/.exec(value);
  if (!iso && !local) return null;
  const year = Number(iso ? iso[1] : local![4]);
  const month = Number(iso ? iso[2] : local![3]);
  const day = Number(iso ? iso[3] : local![1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? { day, month, year } : null;
}

// Read existing, reviewed exam metadata only. Never treat a PDF URL, publication
// timestamp or an arbitrary date in the citation as the day of the exam.
export function examPeriodLabel(exam: ExamDateMetadata): string {
  const term = exam.term?.trim();
  const month = term && /^(?:0?[1-9]|1[0-2])$/.test(term) ? Number(term)
    : monthLabels.findIndex(label => label.toLocaleLowerCase('tr-TR') === term?.toLocaleLowerCase('tr-TR')) + 1;
  const fallback = [month ? monthLabels[month - 1] : term, String(exam.year)].filter(Boolean).join(' ');
  const candidates = Array.from((exam.title ?? '').matchAll(/\((\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{4})\)/gu), match => match[1]!);
  const source = /^EGM (\d+)\. (Temel|Yenileme) Eğitim [AB] kitapçığı, (\d{4}-\d{2}-\d{2})\./u.exec(exam.source?.citation?.trim() ?? '');
  if (source) {
    const education = source[2] === 'Temel' ? 'basic' : 'renewal';
    if ((exam.exam_number?.trim() && Number(exam.exam_number) !== Number(source[1]))
      || (exam.education_type && exam.education_type !== education)) return fallback;
    candidates.push(source[3]!);
  }
  const dates = candidates.map(calendarDay);
  const first = dates[0];
  if (!first || dates.some(date => !date || date.year !== exam.year || (month && date.month !== month)
    || date.day !== first.day || date.month !== first.month || date.year !== first.year)) return fallback;
  return `${first.day} ${monthLabels[first.month - 1]} ${first.year}`;
}
