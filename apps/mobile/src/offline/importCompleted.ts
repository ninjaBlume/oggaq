import type { components, ExamAttempt } from '@oggaq/shared-types';
import type { OfflineDatabase, Owner } from './database';
import type { LocalAttempt } from './attempts';
import type { ExamPackage } from './package';

type Input = components['schemas']['ImportOfflineExamInput'];

/** The immutable final snapshot is retried as one idempotent server transaction. */
export async function importCompletedAttempt(db: OfflineDatabase, owner: Owner, attemptId: string, active: () => boolean, send: (body: Input) => Promise<{ data: ExamAttempt }>): Promise<ExamAttempt> {
  if (!active()) throw new Error('Oturum değişti; sınav cihazda korundu.');
  const stored = await db.attempt(owner, attemptId);
  if (!stored || stored.state !== 'completed') throw new Error('Tamamlanmış sınav bulunamadı.');
  const snapshot = JSON.parse(stored.snapshot) as LocalAttempt;
  const raw = await db.package(owner, stored.packageId);
  if (!raw || snapshot.finishedAt === null) throw new Error('Sınav paketi veya bitiş kaydı bulunamadı.');
  const pack = JSON.parse(raw) as ExamPackage;
  if (pack.package_id !== snapshot.packageId || pack.claim.user_id !== owner.userId || pack.claim.context_id !== owner.contextId) throw new Error('Sınav paketi bu hesaba ait değil.');
  const body: Input = { id: attemptId, package_id: pack.package_id, signature: pack.signature, claim: pack.claim,
    duration_seconds: snapshot.exam.durationSeconds, started_at: new Date(snapshot.startedAt).toISOString(),
    finished_at: new Date(snapshot.finishedAt).toISOString(), elapsed_seconds: Math.min(snapshot.exam.durationSeconds, Math.max(0, Math.floor((snapshot.exam.durationSeconds * 1000 - snapshot.exam.remainingMs) / 1000))),
    answers: snapshot.exam.answers };
  if (!active()) throw new Error('Oturum değişti; sınav cihazda korundu.');
  const response = await send(body);
  if (!active()) throw new Error('Oturum değişti; sınav cihazda korundu.');
  if (response.data.id !== attemptId || response.data.context_id !== owner.contextId || response.data.status !== 'completed') throw new Error('Sunucu yanıtı doğrulanamadı; sınav cihazda korundu.');
  await db.acknowledgeCompleted(owner, attemptId);
  return response.data;
}
