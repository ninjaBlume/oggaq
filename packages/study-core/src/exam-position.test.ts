import { describe, expect, it } from 'vitest';
import { ExamPositionSaver, resumeQuestionIndex } from './exam-position';

describe('resumeQuestionIndex', () => {
  const questions = [{ selected_option_id: 'saved' }, { selected_option_id: null }, { selected_option_id: null }];
  it('restores a bookmarked unanswered question, including navigation backwards', () => {
    expect(resumeQuestionIndex({ status: 'active', resume_position: 3, questions })).toBe(2);
    expect(resumeQuestionIndex({ status: 'active', resume_position: 1, questions })).toBe(0);
  });
  it('supports old attempts and always reviews completed results from the beginning', () => {
    expect(resumeQuestionIndex({ status: 'active', questions })).toBe(1);
    expect(resumeQuestionIndex({ status: 'active', resume_position: 99, questions })).toBe(1);
    expect(resumeQuestionIndex({ status: 'completed', resume_position: 3, questions })).toBe(0);
    expect(resumeQuestionIndex({ status: 'active', questions: [{ selected_option_id: 'saved' }] })).toBe(0);
  });
});

it('serializes navigation writes and keeps the newest position after rapid changes', async () => {
  let release!: () => void;
  const writes: number[] = [];
  const saver = new ExamPositionSaver(async (position) => {
    writes.push(position);
    if (position === 2) await new Promise<void>((resolve) => { release = resolve; });
  }, () => {});
  saver.request(2); saver.request(3); saver.request(5);
  expect(writes).toEqual([2]);
  release();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(writes).toEqual([2, 5]);
});

it('exposes a failed bookmark, retries the same position, and detaches UI updates on unmount', async () => {
  const states: unknown[] = [];
  const writes: number[] = [];
  const failure = new Error('connection lost');
  const saver = new ExamPositionSaver(async (position) => { writes.push(position); if (writes.length === 1) throw failure; }, (state) => states.push(state));
  saver.request(4);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(states.at(-1)).toEqual({ pending: false, error: failure });
  saver.retry();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(writes).toEqual([4, 4]);
  expect(states.at(-1)).toEqual({ pending: false, error: null });
  saver.detach(); saver.request(2);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(states.at(-1)).toEqual({ pending: false, error: null });
  expect(writes).toEqual([4, 4, 2]);
  const resumed: unknown[] = [];
  saver.listen((state) => resumed.push(state));
  saver.request(3);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(resumed).toEqual([{ pending: true, error: null }, { pending: false, error: null }]);
});
