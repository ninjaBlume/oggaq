import type { ExamPackage } from './package';
import type { Owner } from './database';

type Row = ExamPackage['questions'][number];
type Weapon = 'armed' | 'unarmed' | 'weapon_difference';
export type RandomQuestion = { packageId: string; row: Row; section: 'general' | 'weapon' };

/** Uses the most recent downloaded 125-question reference's actual subject/topic quotas. */
export function selectOfflineRandom(packages: ExamPackage[], owner: Owner, education: 'basic' | 'renewal', weapon: Weapon, randomIndex: (maxExclusive: number) => number): RandomQuestion[] {
  const valid = packages.filter(pack => pack.claim.user_id === owner.userId && pack.claim.context_id === owner.contextId
    && pack.exam.education_type === education && pack.exam.weapon_status === 'armed'
    && pack.exam.subject === null && pack.questions.length === 125)
    .sort((a, b) => b.exam.year - a.exam.year || (Number(b.exam.exam_number) || 0) - (Number(a.exam.exam_number) || 0));
  if (!valid.length) throw new Error('Bu eğitim için 125 soruluk sınavı önce indir.');
  const included = (position: number) => weapon === 'armed' || (weapon === 'unarmed' ? position <= 100 : position > 100);
  const section = (position: number): 'general' | 'weapon' => position <= 100 ? 'general' : 'weapon';
  const key = (row: Row) => JSON.stringify([section(row.position), row.question.subject_id, row.question.topic_id]);
  const quotas = new Map<string, number>();
  for (const row of valid[0].questions.filter(item => included(item.position))) quotas.set(key(row), (quotas.get(key(row)) ?? 0) + 1);
  const pool = new Map<string, RandomQuestion>();
  for (const pack of valid) for (const row of pack.questions) {
    if (!included(row.position)) continue;
    // A question repeated in multiple past exams is only one candidate per section.
    const id = JSON.stringify([section(row.position), row.question_id]);
    if (!pool.has(id)) pool.set(id, { packageId: pack.package_id, row, section: section(row.position) });
  }
  const shuffle = <T>(items: T[]): T[] => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1);
      if (!Number.isInteger(j) || j < 0 || j > i) throw new Error('Rastgele seçim oluşturulamadı.');
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  const used = new Set<string>();
  const chosen: RandomQuestion[] = [];
  for (const [quotaKey, count] of quotas) {
    const candidates = shuffle([...pool.values()].filter(item => key(item.row) === quotaKey && !used.has(item.row.question_id)));
    if (candidates.length < count) throw new Error('İndirilen sorular ders ve konu dağılımı için yeterli değil.');
    for (const item of candidates.slice(0, count)) { used.add(item.row.question_id); chosen.push(item); }
  }
  // The scorer requires general questions first and weapon questions last.
  return [...shuffle(chosen.filter(item => item.section === 'general')), ...shuffle(chosen.filter(item => item.section === 'weapon'))];
}
