import type { OfflineDatabase, Owner } from './database';
import { answerOfflineExam, finishOfflineExam, observeOfflineExam, setOfflineTimer, startOfflineExam, type OfflineExam } from './exam';
import type { ExamPackage } from './package';

export type LocalAttempt = { exam: OfflineExam; packageId: string; officialExamId: string; position: number; timerPolicy: 'continuous' | 'pause_on_exit'; startedAt: number; finishedAt: number | null; opened: boolean };

/** Persist the first state and its start operation in the same transaction. */
export async function startLocalAttempt(db: OfflineDatabase, owner: Owner, packageId: string, attemptId: string, operationId: string, seconds: number, now: number, timerPolicy: 'continuous' | 'pause_on_exit' = 'continuous'): Promise<LocalAttempt> {
  if (!Number.isInteger(seconds) || seconds < 60 || seconds > 10800) throw new Error('Süre 1 ile 180 dakika arasında olmalı.');
  const stored = await db.package(owner, packageId);
  if (!stored) throw new Error('Bu hesap için indirilmiş sınav paketi bulunamadı.');
  const pack = JSON.parse(stored) as ExamPackage;
  if (pack.package_id !== packageId || pack.claim?.user_id !== owner.userId || pack.claim?.context_id !== owner.contextId || pack.claim?.official_exam_id !== pack.exam?.id) throw new Error('Sınav paketi bu hesap için geçerli değil.');
  const exam = startOfflineExam(pack.questions.map(row => ({ id: row.question_id, optionIds: row.question.options.map(option => option.id), correctOptionId: row.correct_option_id })), seconds, now);
  const snapshot: LocalAttempt = { exam, packageId: pack.package_id, officialExamId: pack.exam.id, position: 1, timerPolicy, startedAt: now, finishedAt: null, opened: false };
  await db.start(owner, pack.package_id, attemptId, operationId, JSON.stringify(snapshot), JSON.stringify({ package_id: pack.package_id, duration_seconds: seconds, started_at: now, timer_policy: timerPolicy }));
  return snapshot;
}

/** After an unexpected exit, a pause-on-exit timer runs at most 30 seconds past its last checkpoint. */
export async function openLocalAttempt(db: OfflineDatabase, owner: Owner, attemptId: string, now: number): Promise<LocalAttempt> {
  const row = await db.attempt(owner, attemptId);
  if (!row) throw new Error('Etkin çevrimdışı sınav bulunamadı.');
  if (row.state === 'completed') return JSON.parse(row.snapshot) as LocalAttempt;
  const saved = await db.updateSnapshot(owner, attemptId, raw => {
    const snapshot = JSON.parse(raw) as LocalAttempt;
    if (snapshot.opened && snapshot.timerPolicy === 'pause_on_exit' && snapshot.exam.runningSince !== null) {
      const cutoff = Math.min(now, snapshot.exam.lastObservedAt + 30000);
      const exam = setOfflineTimer(snapshot.exam, 'pause', cutoff);
      // An expired session must be finalized through the normal queued finish path.
      return JSON.stringify({ ...snapshot, exam: exam.finished ? snapshot.exam : exam, opened: true });
    }
    return JSON.stringify({ ...snapshot, opened: true });
  });
  return JSON.parse(saved) as LocalAttempt;
}

export async function checkpointLocalAttempt(db: OfflineDatabase, owner: Owner, attemptId: string, now: number): Promise<LocalAttempt> {
  const saved = await db.updateSnapshot(owner, attemptId, raw => {
    const snapshot = JSON.parse(raw) as LocalAttempt;
    const exam = observeOfflineExam(snapshot.exam, now);
    return JSON.stringify({ ...snapshot, exam: exam.finished ? snapshot.exam : exam });
  });
  return JSON.parse(saved) as LocalAttempt;
}

export async function positionLocalAttempt(db: OfflineDatabase, owner: Owner, attemptId: string, operationId: string, position: number): Promise<LocalAttempt> {
  const saved = await db.mutateAttempt(owner, attemptId, operationId, 'position', raw => {
    const snapshot = JSON.parse(raw) as LocalAttempt;
    if (!Number.isInteger(position) || position < 1 || position > snapshot.exam.questions.length) throw new Error('Geçersiz soru konumu.');
    return { snapshot: JSON.stringify({ ...snapshot, position }), payload: JSON.stringify({ position }) };
  });
  return JSON.parse(saved) as LocalAttempt;
}

export async function timerLocalAttempt(db: OfflineDatabase, owner: Owner, attemptId: string, operationId: string, action: 'pause' | 'resume', now: number): Promise<LocalAttempt> {
  const saved = await db.mutateAttempt(owner, attemptId, operationId, 'timer', raw => {
    const snapshot = JSON.parse(raw) as LocalAttempt;
    if (snapshot.timerPolicy !== 'pause_on_exit') throw new Error('Bu sınavda süre devam eder.');
    const exam = setOfflineTimer(snapshot.exam, action, now);
    if (exam.finished) throw new Error('Sınavın süresi doldu; sonucu kaydet.');
    return { snapshot: JSON.stringify({ ...snapshot, exam }), payload: JSON.stringify({ action, at: now }) };
  });
  return JSON.parse(saved) as LocalAttempt;
}

export async function answerLocalAttempt(db: OfflineDatabase, owner: Owner, attemptId: string, operationId: string, questionId: string, optionId: string, now: number): Promise<LocalAttempt> {
  const saved = await db.mutateAttempt(owner, attemptId, operationId, 'answer', raw => {
    const snapshot = JSON.parse(raw) as LocalAttempt;
    const exam = answerOfflineExam(snapshot.exam, questionId, optionId, now);
    return { snapshot: JSON.stringify({ ...snapshot, exam }), payload: JSON.stringify({ question_id: questionId, option_id: optionId, answered_at: now }) };
  });
  return JSON.parse(saved) as LocalAttempt;
}

export async function finishLocalAttempt(db: OfflineDatabase, owner: Owner, attemptId: string, operationId: string, now: number): Promise<LocalAttempt> {
  const saved = await db.mutateAttempt(owner, attemptId, operationId, 'finish', raw => {
    const snapshot = JSON.parse(raw) as LocalAttempt;
    const exam = finishOfflineExam(snapshot.exam, now);
    return { snapshot: JSON.stringify({ ...snapshot, exam, finishedAt: exam.lastObservedAt }), payload: JSON.stringify({ finished_at: exam.lastObservedAt, answers: exam.answers }) };
  });
  return JSON.parse(saved) as LocalAttempt;
}
