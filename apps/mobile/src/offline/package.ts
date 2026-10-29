import type { components } from '@oggaq/shared-types';
import type { OfflineDatabase, Owner } from './database';

export type ExamPackage = components['schemas']['OfflineExamPackageResponse']['data'];

/** A download is made visible only after its complete snapshot is validated and committed. */
export async function storeExamPackage(db: OfflineDatabase, owner: Owner, expectedExamId: string, pack: ExamPackage, digest: (value: string) => Promise<string>): Promise<void> {
  if (pack.claim.version !== 1 || pack.claim.user_id !== owner.userId || pack.claim.context_id !== owner.contextId
    || pack.claim.official_exam_id !== expectedExamId || pack.exam.id !== expectedExamId
    || !/^[a-f0-9]{64}$/.test(pack.package_id) || !/^[a-f0-9]{64}$/.test(pack.signature)
    || !/^[a-f0-9]{64}$/.test(pack.claim.content_hash)
    || !pack.questions.length || pack.questions.length !== pack.exam.question_count || pack.questions.length !== pack.claim.questions.length) {
    throw new Error('İndirilen sınav paketi doğrulanamadı.');
  }
  let content: unknown;
  try { content = JSON.parse(pack.content_json); } catch { throw new Error('İndirilen sınav paketi doğrulanamadı.'); }
  if (await digest(pack.content_json) !== pack.claim.content_hash
    || JSON.stringify(content) !== JSON.stringify({ exam: pack.exam, questions: pack.questions })) throw new Error('İndirilen sınav paketi doğrulanamadı.');
  const seen = new Set<string>();
  for (let index = 0; index < pack.questions.length; index++) {
    const row = pack.questions[index], pinned = pack.claim.questions[index];
    if (!pinned || row.position !== index + 1 || row.position !== pinned.position || row.question_id !== pinned.question_id
      || row.question.id !== pinned.question_version_id || seen.has(row.question_id) || !row.question.published_at
      || row.question.options.length < 2 || new Set(row.question.options.map(o => o.id)).size !== row.question.options.length
      || !row.question.options.some(o => o.id === row.correct_option_id)) {
      throw new Error('İndirilen sınav soruları doğrulanamadı.');
    }
    seen.add(row.question_id);
  }
  await db.savePackage(owner, pack.package_id, JSON.stringify(pack));
}
