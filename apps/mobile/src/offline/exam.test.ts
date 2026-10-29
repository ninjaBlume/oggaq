import { describe, expect, it } from 'vitest';
import { answerOfflineExam, finishOfflineExam, observeOfflineExam, offlineCounts, setOfflineTimer, startOfflineExam } from './exam';

const questions = [
  { id: 'q1', optionIds: ['a', 'b'], correctOptionId: 'a' },
  { id: 'q2', optionIds: ['c', 'd'], correctOptionId: 'd' },
  { id: 'q3', optionIds: ['e', 'f'], correctOptionId: 'e' },
];

describe('offline exam rules', () => {
  it('locks answers, validates choices and counts correct, incorrect and blank', () => {
    let exam = startOfflineExam(questions, 120, 1000);
    exam = answerOfflineExam(exam, 'q1', 'a', 2000);
    exam = answerOfflineExam(exam, 'q2', 'c', 3000);
    expect(offlineCounts(exam)).toEqual({ correct: 1, incorrect: 1, blank: 1 });
    expect(() => answerOfflineExam(exam, 'q1', 'b', 4000)).toThrow('değiştirilemez');
    expect(() => answerOfflineExam(exam, 'q3', 'a', 4000)).toThrow('Geçersiz');
    expect(() => answerOfflineExam(finishOfflineExam(exam, 4000), 'q3', 'e', 4000)).toThrow('tamamlandı');
  });
  it('persists elapsed time through pause, resume, restart and clock rollback', () => {
    let exam = startOfflineExam(questions, 120, 1000);
    exam = setOfflineTimer(exam, 'pause', 11000);
    expect(() => answerOfflineExam(exam, 'q1', 'a', 12000)).toThrow('duraklatıldı');
    exam = JSON.parse(JSON.stringify(exam));
    expect(observeOfflineExam(exam, 61000).remainingMs).toBe(110000);
    exam = setOfflineTimer(exam, 'resume', 61000);
    exam = observeOfflineExam(exam, 71000);
    expect(exam.remainingMs).toBe(100000);
    expect(observeOfflineExam(exam, 60000).remainingMs).toBe(100000);
    expect(observeOfflineExam(exam, 171000).finished).toBe(true);
    expect(() => answerOfflineExam(exam, 'q1', 'a', 171000)).toThrow('tamamlandı');
  });
  it('rejects invalid or ambiguous downloaded content', () => {
    expect(() => startOfflineExam([...questions, questions[0]], 60, 0)).toThrow('soru paketi');
    expect(() => startOfflineExam([{ id: 'x', optionIds: ['a', 'a'], correctOptionId: 'a' }], 60, 0)).toThrow('soru paketi');
    expect(() => startOfflineExam(questions, 0, 0)).toThrow('Geçersiz');
  });
});
