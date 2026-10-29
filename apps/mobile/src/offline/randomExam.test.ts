import { describe, expect, it } from 'vitest';
import type { ExamPackage } from './package';
import { selectOfflineRandom } from './randomExam';

function booklet(education: 'basic' | 'renewal', packageId: string, prefix: string): ExamPackage {
  return { package_id: packageId, claim: { user_id: 'student', context_id: 'personal' }, exam: { id: packageId, education_type: education, weapon_status: 'armed', subject: null, year: 2026, exam_number: '123' },
    questions: Array.from({ length: 125 }, (_, i) => ({ question_id: `${prefix}${i}`, position: i + 1,
      question: { id: `${prefix}-v${i}`, subject_id: i < 50 ? 'law' : i < 100 ? 'health' : 'weapon', topic_id: null, options: [] } })),
  } as unknown as ExamPackage;
}
const chooseFirst = () => 0;
const owner = { userId: 'student', contextId: 'personal' };
describe('downloaded random exam distribution', () => {
  it.each([['armed', 125, 100], ['unarmed', 100, 100], ['weapon_difference', 25, 0]] as const)('keeps the reference quotas for %s', (weapon, length, general) => {
    const basic = booklet('basic', 'basic', 'b');
    const renewal = booklet('renewal', 'renewal', 'r');
    const picked = selectOfflineRandom([renewal, basic], owner, 'basic', weapon, chooseFirst);
    expect(picked).toHaveLength(length);
    expect(picked.filter(item => item.section === 'general')).toHaveLength(general);
    expect(new Set(picked.map(item => item.row.question_id)).size).toBe(length);
    expect(picked.every(item => item.packageId === 'basic')).toBe(true);
    if (general) expect(picked.filter(item => item.row.question.subject_id === 'law')).toHaveLength(50);
  });
  it('deduplicates shared questions and rejects missing or invalid inputs', () => {
    const first = booklet('basic', 'one', 'b');
    const copy = booklet('basic', 'two', 'b');
    expect(new Set(selectOfflineRandom([first, copy], owner, 'basic', 'armed', chooseFirst).map(x => x.row.question_id)).size).toBe(125);
    expect(() => selectOfflineRandom([first], owner, 'renewal', 'armed', chooseFirst)).toThrow('önce indir');
    expect(() => selectOfflineRandom([first], { userId: 'other', contextId: 'personal' }, 'basic', 'armed', chooseFirst)).toThrow('önce indir');
    expect(() => selectOfflineRandom([first], owner, 'basic', 'armed', () => 999)).toThrow('Rastgele seçim');
  });
});
