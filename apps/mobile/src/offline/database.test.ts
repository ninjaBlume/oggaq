/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { OfflineDatabase, type SqlConnection, type SqlDatabase } from './database';
import { OfflineSync } from './sync';
import { storeExamPackage, type ExamPackage } from './package';
import { answerLocalAttempt, checkpointLocalAttempt, finishLocalAttempt, openLocalAttempt, positionLocalAttempt, startLocalAttempt, timerLocalAttempt } from './attempts';
import { offlineCounts } from './exam';
import { importCompletedAttempt } from './importCompleted';
import type { ExamAttempt } from '@oggaq/shared-types';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const query: SqlConnection = {
    execAsync: async sql => { sqlite.exec(sql); },
    runAsync: async (sql, ...args) => ({ changes: Number(sqlite.prepare(sql).run(...args).changes) }),
    getFirstAsync: async <T>(sql: string, ...args: (string | number | null)[]) => (sqlite.prepare(sql).get(...args) ?? null) as T | null,
    getAllAsync: async <T>(sql: string, ...args: (string | number | null)[]) => sqlite.prepare(sql).all(...args) as T[],
  };
  const adapter: SqlDatabase = { ...query, withExclusiveTransactionAsync: async action => {
    sqlite.exec('BEGIN IMMEDIATE');
    try { await action(query); sqlite.exec('COMMIT'); }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
  return { db: new OfflineDatabase(adapter), sqlite };
}
const owner = { userId: 'student-a', contextId: 'personal-a' };
const other = { userId: 'student-b', contextId: 'personal-b' };

describe('SQLite offline transaction log', () => {
  it('commits the attempt and ordered operations, isolating accounts and contexts', async () => {
    const { db, sqlite } = database(); await db.initialize();
    await db.savePackage(owner, 'package-a', '{"version":1}');
    await expect(db.start(other, 'package-a', 'attempt-b', 'operation-b', '{}', '{}')).rejects.toThrow();
    await db.start(owner, 'package-a', 'attempt-a', 'operation-1', '{"position":1}', '{}');
    await db.mutateAttempt(owner, 'attempt-a', 'operation-2', 'answer', () => ({ snapshot: '{"position":2}', payload: '{"option":"A"}' }));
    await db.mutateAttempt(owner, 'attempt-a', 'operation-3', 'finish', () => ({ snapshot: '{"position":2}', payload: '{}' }));
    const queued = await db.operations(owner);
    expect(queued.map(op => [op.kind, op.sequence])).toEqual([['start', 1], ['answer', 2], ['finish', 3]]);
    expect(await db.operations(other)).toEqual([]);
    await expect(db.acknowledge(owner, 'operation-2')).rejects.toThrow('Önceki işlem');
    await expect(db.acknowledge(other, 'operation-1')).rejects.toThrow();
    await db.acknowledge(owner, 'operation-1');
    expect((await db.operations(owner)).map(op => op.operationId)).toEqual(['operation-2', 'operation-3']);
    await expect(db.mutateAttempt(owner, 'attempt-a', 'operation-4', 'answer', () => ({ snapshot: '{}', payload: '{}' }))).rejects.toThrow();
    sqlite.close();
  });
  it('does not commit a package after its session has ended', async () => {
    const { db, sqlite } = database(); await db.initialize();
    await expect(db.savePackage(owner, 'package-a', '{}', () => false)).rejects.toThrow('Oturum değişti');
    expect(await db.package(owner, 'package-a')).toBeNull();
    sqlite.close();
  });
  it('reads only per-account package metadata for lists and preparation', async () => {
    const { db, sqlite } = database(); await db.initialize();
    await db.savePackage(owner, 'p', JSON.stringify({ exam: { id: 'exam', title: 'Sample' }, claim: { questions: [{ question_id: 'q' }] }, questions: [{ stem: 'large content' }] }));
    expect(await db.packageSummaries(other)).toEqual([]);
    const summary = await db.packageSummaries(owner);
    expect(JSON.parse(summary[0].exam)).toEqual({ id: 'exam', title: 'Sample' });
    expect(JSON.stringify(summary)).not.toContain('large content');
    const preparation = await db.packagePreparationData(owner);
    expect(JSON.parse(preparation[0].claim).questions[0].question_id).toBe('q');
    expect(JSON.stringify(preparation)).not.toContain('large content');
    sqlite.close();
  });
  it('rolls back the entire attempt if recording its operation fails', async () => {
    const { db, sqlite } = database(); await db.initialize(); await db.savePackage(owner, 'package-a', 'one');
    await db.start(owner, 'package-a', 'attempt-a', 'operation-1', '{}', '{}');
    await expect(db.start(owner, 'package-a', 'attempt-b', 'operation-1', '{}', '{}')).rejects.toThrow();
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM offline_attempts').get()?.n).toBe(1);
    expect((await db.operations(owner)).length).toBe(1);
    await expect(db.savePackage(owner, 'package-a', 'changed')).rejects.toThrow();
    expect(sqlite.prepare('SELECT manifest FROM offline_packages').get()?.manifest).toBe('one');
    sqlite.close();
  });
  it('refuses a newer schema rather than resetting its version', async () => {
    const { db, sqlite } = database(); sqlite.exec('PRAGMA user_version = 2');
    await expect(db.initialize()).rejects.toThrow('sürümü desteklenmiyor');
    expect(sqlite.prepare('PRAGMA user_version').get()?.user_version).toBe(2);
    sqlite.close();
  });
  it('retains blocked conflicts and later changes without exposing them to another account', async () => {
    const { db, sqlite } = database(); await db.initialize(); await db.savePackage(owner, 'package-a', 'manifest');
    await db.start(owner, 'package-a', 'attempt-a', 'operation-1', '{"step":1}', '{}');
    await db.mutateAttempt(owner, 'attempt-a', 'operation-2', 'answer', () => ({ snapshot: '{"step":2}', payload: '{}' }));
    await db.block(owner, 'operation-1');
    await expect(db.acknowledge(owner, 'operation-1')).rejects.toThrow();
    await expect(db.acknowledge(owner, 'operation-2')).rejects.toThrow('Önceki işlem');
    expect((await db.operations(owner)).map(x => x.status)).toEqual(['blocked', 'pending']);
    expect((await db.attempt(owner, 'attempt-a'))?.snapshot).toBe('{"step":2}');
    expect(await db.attempt(other, 'attempt-a')).toBeNull();
    expect(await db.package(other, 'package-a')).toBeNull();
    expect(await db.packages(other)).toEqual([]);
    expect(await db.attempts(other)).toEqual([]);
    expect(await db.attempts(owner)).toHaveLength(1);
    sqlite.close();
  });
  it('retains uncertain deliveries, replays the same operation and never acknowledges after logout', async () => {
    const { db, sqlite } = database(); await db.initialize(); await db.savePackage(owner, 'package', '{}');
    await db.start(owner, 'package', 'attempt', 'operation-1', '{}', '{}');
    await db.mutateAttempt(owner, 'attempt', 'operation-2', 'answer', () => ({ snapshot: '{}', payload: '{}' }));
    const sync = new OfflineSync(db);
    const first = await sync.run(owner, () => true, async () => { throw new Error('connection lost'); });
    expect(first.stopped).toBe('retry');
    expect((await db.operations(owner)).map(op => op.operationId)).toEqual(['operation-1', 'operation-2']);
    let loggedIn = true;
    const second = await sync.run(owner, () => loggedIn, async () => { loggedIn = false; return 'accepted'; });
    expect(second.stopped).toBe('session_changed');
    expect((await db.operations(owner)).length).toBe(2);
    const delivered: string[] = [];
    const third = await sync.run(owner, () => true, async op => { delivered.push(op.operationId); return op.sequence === 1 ? 'duplicate' : 'accepted'; });
    expect(third.accepted).toBe(2);
    expect(delivered).toEqual(['operation-1', 'operation-2']);
    expect(await db.operations(owner)).toEqual([]);
    sqlite.close();
  });
  it('stops operations dependent on a conflict while allowing another attempt', async () => {
    const { db, sqlite } = database(); await db.initialize(); await db.savePackage(owner, 'package', '{}');
    await db.start(owner, 'package', 'attempt-a', 'operation-a1', '{}', '{}');
    await db.mutateAttempt(owner, 'attempt-a', 'operation-a2', 'answer', () => ({ snapshot: '{}', payload: '{}' }));
    await db.start(owner, 'package', 'attempt-b', 'operation-b1', '{}', '{}');
    const sent: string[] = [];
    const result = await new OfflineSync(db).run(owner, () => true, async op => { sent.push(op.operationId); return op.attemptId === 'attempt-a' ? 'conflict' : 'accepted'; });
    expect(result).toEqual({ accepted: 1, blocked: 1, stopped: 'complete' });
    expect(sent).toEqual(['operation-a1', 'operation-b1']);
    expect((await db.operations(owner)).map(op => [op.operationId, op.status])).toEqual([['operation-a1', 'blocked'], ['operation-a2', 'pending']]);
    sqlite.close();
  });
  it('does not start a second delivery for the same queue or mix a changed account', async () => {
    const { db, sqlite } = database(); await db.initialize(); await db.savePackage(owner, 'package', '{}');
    await db.start(owner, 'package', 'attempt', 'operation', '{}', '{}');
    const sync = new OfflineSync(db);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let sends = 0;
    const send = async () => { sends++; await gate; return 'accepted' as const; };
    const first = sync.run(owner, () => true, send);
    const duplicate = sync.run(owner, () => true, send);
    expect(first).toBe(duplicate);
    expect((await sync.run(other, () => true, send)).stopped).toBe('session_changed');
    release(); await first;
    expect(sends).toBe(1);
    sqlite.close();
  });
  it('stores only a complete package belonging to the current account', async () => {
    const { db, sqlite } = database(); await db.initialize();
    const hash = 'a'.repeat(64);
    const pack = { package_id: hash, signature: hash,
      claim: { version: 1, user_id: owner.userId, context_id: owner.contextId, official_exam_id: 'exam', content_hash: hash,
        questions: [{ question_id: 'question', question_version_id: 'version', position: 1 }] },
      exam: { id: 'exam', question_count: 1 },
      questions: [{ question_id: 'question', position: 1, correct_option_id: 'a',
        question: { id: 'version', published_at: '2026-01-01', options: [{ id: 'a' }, { id: 'b' }] } }],
    } as unknown as ExamPackage;
    pack.content_json = JSON.stringify({ exam: pack.exam, questions: pack.questions });
    const digest = async (value: string) => createHash('sha256').update(value).digest('hex');
    pack.claim.content_hash = await digest(pack.content_json);
    await expect(storeExamPackage(db, other, 'exam', pack, digest)).rejects.toThrow('doğrulanamadı');
    await expect(storeExamPackage(db, owner, 'other', pack, digest)).rejects.toThrow('doğrulanamadı');
    const invalid = structuredClone(pack); invalid.questions[0].correct_option_id = 'missing';
    invalid.content_json = JSON.stringify({ exam: invalid.exam, questions: invalid.questions });
    invalid.claim.content_hash = await digest(invalid.content_json);
    await expect(storeExamPackage(db, owner, 'exam', invalid, digest)).rejects.toThrow('soruları doğrulanamadı');
    const damaged = structuredClone(pack); damaged.content_json += ' ';
    await expect(storeExamPackage(db, owner, 'exam', damaged, digest)).rejects.toThrow('paketi doğrulanamadı');
    expect(await db.package(owner, hash)).toBeNull();
    await storeExamPackage(db, owner, 'exam', pack, digest);
    expect(JSON.parse((await db.package(owner, hash))!).questions).toHaveLength(1);
    sqlite.close();
  });
  it('derives mutations from the last committed snapshot and rolls back invalid updates', async () => {
    const { db, sqlite } = database(); await db.initialize(); await db.savePackage(owner, 'package', '{}');
    await db.start(owner, 'package', 'attempt', 'start', '{"answers":[]}', '{}');
    const add = (value: string) => (snapshot: string) => {
      const state = JSON.parse(snapshot) as { answers: string[] };
      if (state.answers.includes(value)) throw new Error('Yanıt kilitli');
      state.answers.push(value);
      return { snapshot: JSON.stringify(state), payload: value };
    };
    await db.mutateAttempt(owner, 'attempt', 'answer-a', 'answer', add('a'));
    await db.mutateAttempt(owner, 'attempt', 'answer-b', 'answer', add('b'));
    await expect(db.mutateAttempt(owner, 'attempt', 'answer-c', 'answer', add('a'))).rejects.toThrow('kilitli');
    expect(JSON.parse((await db.attempt(owner, 'attempt'))!.snapshot).answers).toEqual(['a', 'b']);
    expect((await db.operations(owner)).map(op => op.operationId)).toEqual(['start', 'answer-a', 'answer-b']);
    sqlite.close();
  });
  it('persists a complete local exam and its ordered operations across reopening', async () => {
    const { db, sqlite } = database(); await db.initialize();
    const pack = { package_id: 'package', claim: { user_id: owner.userId, context_id: owner.contextId, official_exam_id: 'exam' }, exam: { id: 'exam' }, questions: [
      { question_id: 'q1', correct_option_id: 'a', question: { options: [{ id: 'a' }, { id: 'b' }] } },
      { question_id: 'q2', correct_option_id: 'd', question: { options: [{ id: 'c' }, { id: 'd' }] } },
    ] };
    await db.savePackage(owner, 'package', JSON.stringify(pack));
    await expect(startLocalAttempt(db, other, 'package', 'x', 'x', 600, 1000)).rejects.toThrow('bulunamadı');
    await startLocalAttempt(db, owner, 'package', 'attempt', 'start', 600, 1000, 'pause_on_exit');
    await positionLocalAttempt(db, owner, 'attempt', 'position', 2);
    await timerLocalAttempt(db, owner, 'attempt', 'pause', 'pause', 1500);
    await expect(answerLocalAttempt(db, owner, 'attempt', 'paused-answer', 'q1', 'b', 1600)).rejects.toThrow('duraklatıldı');
    await timerLocalAttempt(db, owner, 'attempt', 'resume', 'resume', 1700);
    await answerLocalAttempt(db, owner, 'attempt', 'answer', 'q1', 'b', 2000);
    await expect(answerLocalAttempt(db, owner, 'attempt', 'again', 'q1', 'a', 3000)).rejects.toThrow('değiştirilemez');
    const completed = await finishLocalAttempt(db, owner, 'attempt', 'finish', 4000);
    expect(offlineCounts(completed.exam)).toEqual({ correct: 0, incorrect: 1, blank: 1 });
    const restored = JSON.parse((await db.attempt(owner, 'attempt'))!.snapshot);
    expect(restored.exam.finished).toBe(true);
    expect(restored.position).toBe(2);
    expect((await db.operations(owner)).map(op => op.kind)).toEqual(['start', 'position', 'timer', 'timer', 'answer', 'finish']);
    sqlite.close();
  });
  it('allows only one active random exam per account until it is finished', async () => {
    const { db, sqlite } = database(); await db.initialize(); await db.savePackage(owner, 'p', '{}');
    await db.start(owner, 'p', 'a', 'start-a', '{}', '{}', true);
    await expect(db.start(owner, 'p', 'b', 'start-b', '{}', '{}', true)).rejects.toThrow('önce bitir');
    await db.mutateAttempt(owner, 'a', 'finish-a', 'finish', () => ({ snapshot: '{}', payload: '{}' }));
    await db.start(owner, 'p', 'b', 'start-b', '{}', '{}', true);
    expect((await db.attempt(owner, 'b'))?.state).toBe('active');
    sqlite.close();
  });
  it('recovers a crash with the chosen pause policy and retains elapsed time before its last checkpoint', async () => {
    const { db, sqlite } = database(); await db.initialize();
    const pack = { package_id: 'package', claim: { user_id: owner.userId, context_id: owner.contextId, official_exam_id: 'exam' }, exam: { id: 'exam' }, questions: [
      { question_id: 'q1', correct_option_id: 'a', question: { options: [{ id: 'a' }, { id: 'b' }] } },
    ] };
    await db.savePackage(owner, 'package', JSON.stringify(pack));
    await startLocalAttempt(db, owner, 'package', 'attempt', 'start', 600, 1000, 'pause_on_exit');
    expect((await openLocalAttempt(db, owner, 'attempt', 1000)).exam.runningSince).not.toBeNull();
    await checkpointLocalAttempt(db, owner, 'attempt', 21000);
    const recovered = await openLocalAttempt(db, owner, 'attempt', 200000);
    expect(recovered.exam.runningSince).toBeNull();
    expect(recovered.exam.remainingMs).toBe(550000);
    sqlite.close();
  });
  it('erases only the deleted account including pending operations', async () => {
    const { db, sqlite } = database(); await db.initialize();
    for (const who of [owner, other]) {
      await db.savePackage(who, 'package', '{}');
      await db.start(who, 'package', 'attempt', 'start', '{}', '{}');
    }
    await db.eraseUser(owner.userId);
    expect(await db.packages(owner)).toEqual([]);
    expect(await db.attempts(owner)).toEqual([]);
    expect(await db.operations(owner)).toEqual([]);
    expect(await db.attempts(other)).toHaveLength(1);
    expect(await db.operations(other)).toHaveLength(1);
    sqlite.close();
  });
  it('keeps all local operations until a completed server result is confirmed for the same account', async () => {
    const { db, sqlite } = database(); await db.initialize();
    const pack = { package_id: 'package', signature: 'signature', claim: { user_id: owner.userId, context_id: owner.contextId, official_exam_id: 'exam' }, exam: { id: 'exam' }, questions: [
      { question_id: 'q1', correct_option_id: 'a', question: { options: [{ id: 'a' }, { id: 'b' }] } },
    ] };
    await db.savePackage(owner, 'package', JSON.stringify(pack));
    await startLocalAttempt(db, owner, 'package', 'attempt', 'start', 600, 1000);
    await answerLocalAttempt(db, owner, 'attempt', 'answer', 'q1', 'a', 2000);
    await finishLocalAttempt(db, owner, 'attempt', 'finish', 3000);
    const sendFailure = async () => { throw new Error('network'); };
    await expect(importCompletedAttempt(db, owner, 'attempt', () => true, sendFailure)).rejects.toThrow('network');
    expect(await db.operations(owner)).toHaveLength(3);
    let active = true;
    const success = async () => ({ data: { id: 'attempt', context_id: owner.contextId, status: 'completed' } as ExamAttempt });
    await expect(importCompletedAttempt(db, owner, 'attempt', () => active, async () => { active = false; return success(); })).rejects.toThrow('Oturum değişti');
    expect(await db.operations(owner)).toHaveLength(3);
    const result = await importCompletedAttempt(db, owner, 'attempt', () => true, success);
    expect(result.id).toBe('attempt');
    expect(await db.operations(owner)).toEqual([]);
    expect((await db.attempt(owner, 'attempt'))?.state).toBe('completed');
    expect(await db.attemptSummaries(owner)).toEqual([]);
    sqlite.close();
  });
});
