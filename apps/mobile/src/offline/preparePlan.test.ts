import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { components } from '@oggaq/shared-types';
import { examsToPrepare, prepareQueue, revisionInput } from './preparePlan';
import type { ExamPackage } from './package';

type Exam = components['schemas']['OfficialExam'];
const exam = (id: string, count = 1) => ({ id, question_count: count, title: id, published_at: '2026-01-01' }) as Exam;
const claim = { scoring_period_id: null, scoring_rule_id: null, questions: [{ position: 1, question_id: 'q', question_version_id: 'v1' }] } as ExamPackage['claim'];
const digest = async (value: string) => createHash('sha256').update(value).digest('hex');
const saved = JSON.stringify({ exam: exam('a'), claim });

describe('automatic offline preparation', () => {
  it('skips unchanged packages and empty exams but discovers a new exam', async () => {
    const rev = await digest(revisionInput(claim));
    expect((await examsToPrepare([exam('a'), exam('b'), exam('empty', 0)], [saved], [{ exam_id: 'a', revision: rev }], digest)).map(x => x.id)).toEqual(['b']);
  });
  it('re-downloads a corrected question even when its exam metadata is unchanged', async () => {
    const rev = await digest(revisionInput({ ...claim, questions: [{ ...claim.questions[0], question_version_id: 'v2' }] }));
    expect((await examsToPrepare([exam('a')], [saved], [{ exam_id: 'a', revision: rev }], digest)).map(x => x.id)).toEqual(['a']);
  });
  it('does not treat a corrupt package or a missing revision as prepared', async () => {
    expect((await examsToPrepare([exam('a')], ['broken json'], [], digest)).map(x => x.id)).toEqual(['a']);
  });
});


describe('preparation queue interruptions', () => {
  it('stops on lost session without recording an unfinished package', async () => {
    let active = true; const done: string[] = [];
    await prepareQueue(['one', 'two'], () => active, async item => { if (item === 'two') active = false; }, () => false, item => done.push(item), async () => {});
    expect(done).toEqual(['one']);
  });
  it('keeps completed work on a temporary network error and aborts further downloads', async () => {
    const done: string[] = [], requested: string[] = [];
    await expect(prepareQueue(['one', 'two', 'three'], () => true, async item => { requested.push(item); if (item === 'two') throw new Error('network'); }, () => false, item => done.push(item), async () => {})).rejects.toThrow('network');
    expect(done).toEqual(['one']); expect(requested).toEqual(['one', 'two']);
  });
  it('reports a permanently invalid item while continuing the rest', async () => {
    const outcomes: boolean[] = [];
    await prepareQueue(['one', 'two'], () => true, async item => { if (item === 'one') throw new Error('invalid'); }, () => true, (_item, saved) => outcomes.push(saved), async () => {});
    expect(outcomes).toEqual([false, true]);
  });
});
