import { describe, expect, it } from 'vitest';
import { examAttemptTitle } from './index';

describe('exam attempt name', () => {
  it('identifies generated exams throughout resume, history and the active header', () => {
    expect(examAttemptTitle({ official_exam: null, random_exam: { title: 'Rastgele sınav · Temel eğitim · Silahlı' }, question_count: 125 })).toBe('Rastgele sınav · Temel eğitim · Silahlı');
  });
  it('preserves named past exams and older unnamed attempt fallbacks', () => {
    expect(examAttemptTitle({ official_exam: { title: '122. Temel (29.08.2026)' }, question_count: 125 })).toBe('122. Temel');
    expect(examAttemptTitle({ official_exam: null, question_count: 3 })).toBe('3 soruluk deneme');
    expect(examAttemptTitle({ official_exam: null, question_count: 3 }, 'sınav')).toBe('3 soruluk sınav');
  });
});
