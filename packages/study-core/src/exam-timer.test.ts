import { describe, expect, it } from 'vitest';
import { ExamTimerSession, mergeExamTimer } from './exam-timer';
import type { ExamAttempt, ExamSummary } from '@oggaq/shared-types';
describe('exam timer presence', () => {
  it('serializes a slow opening with leave and return, and stops heartbeat when hidden', async () => {
    const actions: string[] = [];let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const session = new ExamTimerSession(async action => { actions.push(action);if (actions.length === 1) await gate; });
    const opening = session.setVisible(true);session.setVisible(false);const returned = session.setVisible(true);
    await Promise.resolve();expect(actions).toEqual(['resume']);release();await opening;await returned;
    expect(actions).toEqual(['resume', 'pause', 'resume']);await session.pause();await session.heartbeat();expect(actions.at(-1)).toBe('pause');
  });
  it('surfaces failed time writes and allows an explicit resume retry', async () => {
    let fail = true;const updates: {pending: boolean; error: unknown}[] = [];
    const session = new ExamTimerSession(async () => {if (fail) throw new Error('Synthetic offline');});
    session.listen(value => updates.push(value));await session.resume();expect(updates.at(-1)?.error).toBeInstanceOf(Error);
    fail = false;await session.resume();expect(updates.at(-1)).toEqual({pending: false, error: null});
  });
  it('merges clock metadata without losing question selections or accepting old/foreign state', () => {
    const exam = {id:'exam',context_id:'mine',revision:4,status:'active',questions:[{id:'q',selected_option_id:'a'}]} as ExamAttempt;
    const summary = {id:'exam',context_id:'mine',revision:5,status:'active',timer_paused:true,remaining_seconds:73} as ExamSummary;
    const next=mergeExamTimer(exam,summary);expect(next.questions).toBe(exam.questions);expect(next.remaining_seconds).toBe(73);
    expect(mergeExamTimer(next,{...summary,revision:4,remaining_seconds:99})).toBe(next);
    expect(()=>mergeExamTimer(exam,{...summary,context_id:'other'})).toThrow();
  });
});
