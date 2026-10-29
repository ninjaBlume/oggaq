/** Pure rules for a locally persisted practice session. Times are milliseconds since epoch. */
export type OfflineQuestion = { id: string; optionIds: string[]; correctOptionId: string };
export type OfflineExam = {
  questions: OfflineQuestion[];
  answers: Record<string, string>;
  durationSeconds: number;
  remainingMs: number;
  runningSince: number | null;
  lastObservedAt: number;
  finished: boolean;
};

export function startOfflineExam(questions: OfflineQuestion[], durationSeconds: number, now: number): OfflineExam {
  if (!questions.length || !Number.isInteger(durationSeconds) || durationSeconds <= 0 || !Number.isFinite(now)) throw new Error('Geçersiz sınav.');
  const ids = new Set<string>();
  for (const q of questions) {
    if (!q.id || ids.has(q.id) || q.optionIds.length < 2 || new Set(q.optionIds).size !== q.optionIds.length || !q.optionIds.includes(q.correctOptionId)) throw new Error('Geçersiz soru paketi.');
    ids.add(q.id);
  }
  return { questions, answers: {}, durationSeconds, remainingMs: durationSeconds * 1000, runningSince: now, lastObservedAt: now, finished: false };
}

/** A backward clock change never restores elapsed time; device clocks are not a trusted authority. */
export function observeOfflineExam(exam: OfflineExam, now: number): OfflineExam {
  if (!Number.isFinite(now)) throw new Error('Geçersiz zaman.');
  const observed = Math.max(now, exam.lastObservedAt);
  if (exam.runningSince === null || exam.finished) return { ...exam, lastObservedAt: observed };
  const remainingMs = Math.max(0, exam.remainingMs - Math.max(0, observed - exam.runningSince));
  return { ...exam, remainingMs, runningSince: remainingMs > 0 ? observed : null, lastObservedAt: observed, finished: remainingMs === 0 };
}

export function setOfflineTimer(exam: OfflineExam, action: 'pause' | 'resume', now: number): OfflineExam {
  const current = observeOfflineExam(exam, now);
  if (current.finished) return current;
  return { ...current, runningSince: action === 'pause' ? null : current.runningSince ?? current.lastObservedAt };
}

export function answerOfflineExam(exam: OfflineExam, questionId: string, optionId: string, now: number): OfflineExam {
  const current = observeOfflineExam(exam, now);
  if (current.finished) throw new Error('Sınav tamamlandı.');
  if (current.runningSince === null) throw new Error('Sınav süresi duraklatıldı.');
  const question = current.questions.find(item => item.id === questionId);
  if (!question || !question.optionIds.includes(optionId)) throw new Error('Geçersiz soru veya seçenek.');
  if (Object.hasOwn(current.answers, questionId)) throw new Error('Yanıtlanan soru değiştirilemez.');
  return { ...current, answers: { ...current.answers, [questionId]: optionId } };
}

export function finishOfflineExam(exam: OfflineExam, now: number): OfflineExam {
  const current = observeOfflineExam(exam, now);
  if (!current.finished && current.runningSince === null) throw new Error('Sınav süresi duraklatıldı.');
  return { ...current, runningSince: null, finished: true };
}

/** These are provisional counts, not an authoritative server score. */
export function offlineCounts(exam: OfflineExam): { correct: number; incorrect: number; blank: number } {
  let correct = 0, incorrect = 0;
  for (const question of exam.questions) {
    const answer = exam.answers[question.id];
    if (answer === undefined) continue;
    if (answer === question.correctOptionId) correct++; else incorrect++;
  }
  return { correct, incorrect, blank: exam.questions.length - correct - incorrect };
}
