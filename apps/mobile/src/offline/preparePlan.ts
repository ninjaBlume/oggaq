import type { components } from '@oggaq/shared-types';
import type { ExamPackage } from './package';

type OfficialExam = components['schemas']['OfficialExam'];
type Revision = { exam_id: string; revision: string };

/** The revision covers every pinned question and scoring rule, not just the visible title. */
export function revisionInput(claim: ExamPackage['claim']): string {
  const versions = claim.questions.map(row => `${row.position}:${row.question_id}:${row.question_version_id}`).join(',');
  return `${claim.scoring_period_id ?? ''}:${claim.scoring_rule_id ?? ''}|${versions}`;
}

export async function examsToPrepare(exams: OfficialExam[], manifests: string[], revisions: Revision[], digest: (value: string) => Promise<string>): Promise<OfficialExam[]> {
  const expected = new Map(revisions.map(item => [item.exam_id, item.revision]));
  const current = new Map<string, Set<string>>();
  for (const manifest of manifests) {
    try {
      const pack = JSON.parse(manifest) as ExamPackage;
      if (pack.exam?.id && pack.claim?.questions) {
        const revision = await digest(revisionInput(pack.claim));
        const versions = current.get(pack.exam.id) ?? new Set<string>();
        versions.add(`${JSON.stringify(pack.exam)}:${revision}`);
        current.set(pack.exam.id, versions);
      }
    } catch {
      // A damaged record is not proof that the exam is ready.
    }
  }
  return exams.filter(exam => exam.question_count > 0 && (!expected.has(exam.id) || !current.get(exam.id)?.has(`${JSON.stringify(exam)}:${expected.get(exam.id)}`)));
}

/** One package at a time; cancellation and transient errors never mark an unfinished item as complete. */
export async function prepareQueue<T>(items: T[], active: () => boolean, download: (item: T) => Promise<void>, permanent: (error: unknown, item: T) => boolean, progress: (item: T, saved: boolean) => void, pause: () => Promise<void>): Promise<void> {
  for (const item of items) {
    if (!active()) return;
    try {
      await download(item);
      if (!active()) return;
      progress(item, true);
    } catch (error) {
      if (!active()) return;
      if (!permanent(error, item)) throw error;
      progress(item, false);
    }
    if (active()) await pause();
  }
}
