import type { OfflineDatabase, Owner, QueuedOperation } from './database';

export type Delivery = 'accepted' | 'duplicate' | 'conflict' | 'unauthorized' | 'retry';
export type SyncSummary = { accepted: number; blocked: number; stopped: 'complete' | 'retry' | 'unauthorized' | 'session_changed' };

/** The sender must use operationId as the server idempotency key and authenticate each operation. */
export class OfflineSync {
  private running: Promise<SyncSummary> | undefined;
  private ownerKey: string | undefined;
  constructor(private db: OfflineDatabase) {}

  run(owner: Owner, active: () => boolean, send: (operation: QueuedOperation) => Promise<Delivery>): Promise<SyncSummary> {
    const key = JSON.stringify([owner.userId, owner.contextId]);
    if (this.running) return this.ownerKey === key ? this.running : Promise.resolve({ accepted: 0, blocked: 0, stopped: 'session_changed' });
    const task = this.drain(owner, active, send);
    this.running = task;
    this.ownerKey = key;
    void task.finally(() => { if (this.running === task) { this.running = undefined; this.ownerKey = undefined; } }).catch(() => {});
    return task;
  }

  private async drain(owner: Owner, active: () => boolean, send: (operation: QueuedOperation) => Promise<Delivery>): Promise<SyncSummary> {
    let accepted = 0, blocked = 0;
    const blockedAttempts = new Set<string>();
    for (const op of await this.db.operations(owner)) {
      if (!active()) return { accepted, blocked, stopped: 'session_changed' };
      if (op.status === 'blocked') { blockedAttempts.add(op.attemptId); continue; }
      if (blockedAttempts.has(op.attemptId)) continue;
      // An unknown delivery outcome must leave the operation intact for an idempotent retry.
      let result: Delivery;
      try { result = await send(op); } catch { return { accepted, blocked, stopped: 'retry' }; }
      if (!active()) return { accepted, blocked, stopped: 'session_changed' };
      if (result === 'unauthorized') return { accepted, blocked, stopped: 'unauthorized' };
      if (result === 'retry') return { accepted, blocked, stopped: 'retry' };
      if (!['accepted', 'duplicate', 'conflict'].includes(result)) return { accepted, blocked, stopped: 'retry' };
      if (result === 'conflict') {
        await this.db.block(owner, op.operationId);
        blockedAttempts.add(op.attemptId); blocked++;
      } else {
        await this.db.acknowledge(owner, op.operationId); accepted++;
      }
    }
    return { accepted, blocked, stopped: 'complete' };
  }
}
