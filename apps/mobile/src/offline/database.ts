/** Minimal adapter shared by native SQLite and the real SQLite tests. */
export interface SqlConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<{ changes: number }>;
  getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
}
export interface SqlDatabase extends SqlConnection {
  withExclusiveTransactionAsync(action: (transaction: SqlConnection) => Promise<void>): Promise<void>;
}
export type Owner = { userId: string; contextId: string };
export type QueuedOperation = { operationId: string; attemptId: string; sequence: number; kind: "start" | "answer" | "finish" | "timer" | "position"; payload: string; status: "pending" | "blocked" };
export type StoredAttempt = { id: string; packageId: string; snapshot: string; state: 'active' | 'completed' };
export type AttemptSummary = { id: string; packageId: string; state: 'active' | 'completed'; pending: number };

/** No network or UI side effects: every local mutation and its retry record commit together. */
export class OfflineDatabase {
  constructor(private readonly db: SqlDatabase) {}

  async initialize(): Promise<void> {
    await this.db.execAsync('PRAGMA foreign_keys = ON');
    const version = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) > 1) throw new Error('Bu cihazdaki çevrimdışı veri sürümü desteklenmiyor.');
    if (version?.user_version === 1) return;
    await this.db.withExclusiveTransactionAsync(tx => tx.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_packages (
        user_id TEXT NOT NULL, context_id TEXT NOT NULL, id TEXT NOT NULL,
        manifest TEXT NOT NULL, PRIMARY KEY (user_id, context_id, id)
      );
      CREATE TABLE IF NOT EXISTS offline_attempts (
        user_id TEXT NOT NULL, context_id TEXT NOT NULL, id TEXT NOT NULL,
        package_id TEXT NOT NULL, snapshot TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('active', 'completed')),
        is_random INTEGER NOT NULL DEFAULT 0 CHECK (is_random IN (0, 1)),
        next_sequence INTEGER NOT NULL CHECK (next_sequence > 0),
        PRIMARY KEY (user_id, context_id, id),
        FOREIGN KEY (user_id, context_id, package_id) REFERENCES offline_packages(user_id, context_id, id)
      );
      CREATE TABLE IF NOT EXISTS offline_outbox (
        user_id TEXT NOT NULL, context_id TEXT NOT NULL, operation_id TEXT NOT NULL,
        attempt_id TEXT NOT NULL, sequence INTEGER NOT NULL CHECK (sequence > 0),
        kind TEXT NOT NULL CHECK (kind IN ('start', 'answer', 'finish', 'timer', 'position')),
        payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'blocked')),
        PRIMARY KEY (user_id, operation_id), UNIQUE (user_id, context_id, attempt_id, sequence),
        FOREIGN KEY (user_id, context_id, attempt_id) REFERENCES offline_attempts(user_id, context_id, id)
      );
      CREATE INDEX IF NOT EXISTS offline_outbox_owner_order ON offline_outbox(user_id, context_id, attempt_id, sequence);
      CREATE UNIQUE INDEX IF NOT EXISTS offline_one_active_random ON offline_attempts(user_id, context_id) WHERE is_random = 1 AND state = 'active';
      PRAGMA user_version = 1;
    `));
  }

  async savePackage(owner: Owner, id: string, manifest: string, allowed: () => boolean = () => true): Promise<void> {
    // A package identifier pins an immutable published revision. Never overwrite a different snapshot.
    await this.db.withExclusiveTransactionAsync(async tx => {
      if (!allowed()) throw new Error('Oturum değişti; sınav indirilmedi.');
      const previous = await tx.getFirstAsync<{ manifest: string }>(
        'SELECT manifest FROM offline_packages WHERE user_id = ? AND context_id = ? AND id = ?', owner.userId, owner.contextId, id);
      if (previous && previous.manifest !== manifest) throw new Error('Paket sürümü değiştirilemez.');
      if (!previous) await tx.runAsync('INSERT INTO offline_packages(user_id, context_id, id, manifest) VALUES (?, ?, ?, ?)', owner.userId, owner.contextId, id, manifest);
    });
  }

  async start(owner: Owner, packageId: string, attemptId: string, operationId: string, snapshot: string, payload: string, random = false): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async tx => {
      const pack = await tx.getFirstAsync<{ id: string }>('SELECT id FROM offline_packages WHERE user_id = ? AND context_id = ? AND id = ?', owner.userId, owner.contextId, packageId);
      if (!pack) throw new Error('Bu hesap için indirilmiş sınav paketi bulunamadı.');
      if (random && await tx.getFirstAsync('SELECT id FROM offline_attempts WHERE user_id = ? AND context_id = ? AND is_random = 1 AND state = ?', owner.userId, owner.contextId, 'active')) throw new Error('Devam eden rastgele sınavını önce bitir.');
      await tx.runAsync("INSERT INTO offline_attempts(user_id, context_id, id, package_id, snapshot, state, is_random, next_sequence) VALUES (?, ?, ?, ?, ?, 'active', ?, 2)", owner.userId, owner.contextId, attemptId, packageId, snapshot, random ? 1 : 0);
      await tx.runAsync("INSERT INTO offline_outbox(user_id, context_id, operation_id, attempt_id, sequence, kind, payload) VALUES (?, ?, ?, ?, 1, 'start', ?)", owner.userId, owner.contextId, operationId, attemptId, payload);
    });
  }

  /** Compute from the last committed state while holding the write lock. */
  async mutateAttempt(owner: Owner, attemptId: string, operationId: string, kind: 'answer' | 'finish' | 'timer' | 'position', update: (snapshot: string) => { snapshot: string; payload: string }): Promise<string> {
    let result = '';
    await this.db.withExclusiveTransactionAsync(async tx => {
      const attempt = await tx.getFirstAsync<{ state: string; next_sequence: number; snapshot: string }>(
        'SELECT state, next_sequence, snapshot FROM offline_attempts WHERE user_id = ? AND context_id = ? AND id = ?', owner.userId, owner.contextId, attemptId);
      if (!attempt || attempt.state !== 'active') throw new Error('Etkin çevrimdışı sınav bulunamadı.');
      const mutation = update(attempt.snapshot);
      await tx.runAsync('INSERT INTO offline_outbox(user_id, context_id, operation_id, attempt_id, sequence, kind, payload) VALUES (?, ?, ?, ?, ?, ?, ?)', owner.userId, owner.contextId, operationId, attemptId, attempt.next_sequence, kind, mutation.payload);
      await tx.runAsync('UPDATE offline_attempts SET snapshot = ?, state = ?, next_sequence = ? WHERE user_id = ? AND context_id = ? AND id = ?', mutation.snapshot, kind === 'finish' ? 'completed' : 'active', attempt.next_sequence + 1, owner.userId, owner.contextId, attemptId);
      result = mutation.snapshot;
    });
    return result;
  }

  async updateSnapshot(owner: Owner, attemptId: string, update: (snapshot: string) => string): Promise<string> {
    let result = '';
    await this.db.withExclusiveTransactionAsync(async tx => {
      const row = await tx.getFirstAsync<{ snapshot: string; state: string }>('SELECT snapshot, state FROM offline_attempts WHERE user_id = ? AND context_id = ? AND id = ?', owner.userId, owner.contextId, attemptId);
      if (!row || row.state !== 'active') throw new Error('Etkin çevrimdışı sınav bulunamadı.');
      result = update(row.snapshot);
      await tx.runAsync('UPDATE offline_attempts SET snapshot = ? WHERE user_id = ? AND context_id = ? AND id = ?', result, owner.userId, owner.contextId, attemptId);
    });
    return result;
  }

  async operations(owner: Owner): Promise<QueuedOperation[]> {
    return this.db.getAllAsync<QueuedOperation>(`SELECT operation_id AS operationId, attempt_id AS attemptId, sequence, kind, payload, status
      FROM offline_outbox WHERE user_id = ? AND context_id = ? ORDER BY attempt_id, sequence`, owner.userId, owner.contextId);
  }

  async attempt(owner: Owner, id: string): Promise<StoredAttempt | null> {
    return this.db.getFirstAsync<StoredAttempt>('SELECT id, package_id AS packageId, snapshot, state FROM offline_attempts WHERE user_id = ? AND context_id = ? AND id = ?', owner.userId, owner.contextId, id);
  }

  async package(owner: Owner, id: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ manifest: string }>('SELECT manifest FROM offline_packages WHERE user_id = ? AND context_id = ? AND id = ?', owner.userId, owner.contextId, id);
    return row?.manifest ?? null;
  }

  async packages(owner: Owner): Promise<{ id: string; manifest: string }[]> {
    return this.db.getAllAsync<{ id: string; manifest: string }>('SELECT id, manifest FROM offline_packages WHERE user_id = ? AND context_id = ? ORDER BY rowid DESC', owner.userId, owner.contextId);
  }

  async attempts(owner: Owner): Promise<StoredAttempt[]> {
    return this.db.getAllAsync<StoredAttempt>('SELECT id, package_id AS packageId, snapshot, state FROM offline_attempts WHERE user_id = ? AND context_id = ? ORDER BY rowid DESC', owner.userId, owner.contextId);
  }

  async attemptSummaries(owner: Owner): Promise<AttemptSummary[]> {
    return this.db.getAllAsync<AttemptSummary>(`SELECT a.id, a.package_id AS packageId, a.state,
      EXISTS(SELECT 1 FROM offline_outbox o WHERE o.user_id = a.user_id AND o.context_id = a.context_id AND o.attempt_id = a.id) AS pending
      FROM offline_attempts a WHERE a.user_id = ? AND a.context_id = ? AND (a.state = 'active' OR EXISTS(
        SELECT 1 FROM offline_outbox o WHERE o.user_id = a.user_id AND o.context_id = a.context_id AND o.attempt_id = a.id)) ORDER BY a.rowid DESC`, owner.userId, owner.contextId);
  }

  async eraseUser(userId: string): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async tx => {
      await tx.runAsync('DELETE FROM offline_outbox WHERE user_id = ?', userId);
      await tx.runAsync('DELETE FROM offline_attempts WHERE user_id = ?', userId);
      await tx.runAsync('DELETE FROM offline_packages WHERE user_id = ?', userId);
    });
  }

  /** Keep a conflict and later operations on the device until explicitly resolved. */
  async block(owner: Owner, operationId: string): Promise<void> {
    const result = await this.db.runAsync("UPDATE offline_outbox SET status = 'blocked' WHERE user_id = ? AND context_id = ? AND operation_id = ? AND status = 'pending'", owner.userId, owner.contextId, operationId);
    if (result.changes !== 1) throw new Error('Bekleyen işlem bulunamadı.');
  }

  async acknowledge(owner: Owner, operationId: string): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async tx => {
      const row = await tx.getFirstAsync<{ attempt_id: string; sequence: number; status: string }>('SELECT attempt_id, sequence, status FROM offline_outbox WHERE user_id = ? AND context_id = ? AND operation_id = ?', owner.userId, owner.contextId, operationId);
      if (!row || row.status !== 'pending') throw new Error('Bekleyen işlem bulunamadı.');
      const earlier = await tx.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM offline_outbox WHERE user_id = ? AND context_id = ? AND attempt_id = ? AND sequence < ?', owner.userId, owner.contextId, row.attempt_id, row.sequence);
      if (earlier?.count) throw new Error('Önceki işlem henüz eşitlenmedi.');
      await tx.runAsync('DELETE FROM offline_outbox WHERE user_id = ? AND context_id = ? AND operation_id = ?', owner.userId, owner.contextId, operationId);
    });
  }

  /** Whole completed attempt was accepted atomically; preserve its snapshot for local history. */
  async acknowledgeCompleted(owner: Owner, attemptId: string): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async tx => {
      const attempt = await tx.getFirstAsync<{ state: string }>('SELECT state FROM offline_attempts WHERE user_id = ? AND context_id = ? AND id = ?', owner.userId, owner.contextId, attemptId);
      if (!attempt || attempt.state !== 'completed') throw new Error('Tamamlanmış sınav bulunamadı.');
      const blocked = await tx.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM offline_outbox WHERE user_id = ? AND context_id = ? AND attempt_id = ? AND status = 'blocked'", owner.userId, owner.contextId, attemptId);
      if (blocked?.count) throw new Error('Çakışan sınav kaydı korunuyor.');
      await tx.runAsync('DELETE FROM offline_outbox WHERE user_id = ? AND context_id = ? AND attempt_id = ?', owner.userId, owner.contextId, attemptId);
    });
  }
}
