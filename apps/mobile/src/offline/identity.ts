import type { StudyContext, User } from "@oggaq/shared-types";

type Snapshot = { version: 1; sessionDigest: string; user: User; context: StudyContext };

/** A snapshot is bound to the exact unexpired device session and contains only the personal context. */
export class OfflineIdentityStore {
  private pending: Promise<void> = Promise.resolve();
  constructor(private storage: {
    read: () => Promise<string | null>;
    write: (value: string) => Promise<void>;
    remove: () => Promise<void>;
  }, private digest: (token: string) => Promise<string>) {}

  async save(token: string, user: User, contexts: StudyContext[]): Promise<void> {
    const context = contexts.find(item => item.kind === "personal" && item.tenant_id === null && item.membership_id === null);
    if (!token || !context) return;
    await this.mutate(async () => {
      const snapshot: Snapshot = { version: 1, sessionDigest: await this.digest(token), user, context };
      await this.storage.write(JSON.stringify(snapshot));
    });
  }

  async read(token: string | null): Promise<{ user: User; contexts: StudyContext[] } | null> {
    if (!token) return null;
    await this.pending;
    const raw = await this.storage.read();
    if (!raw) return null;
    let value: Snapshot;
    try { value = JSON.parse(raw) as Snapshot; } catch { return null; }
    if (value?.version !== 1 || value.sessionDigest !== await this.digest(token)
      || typeof value.user?.id !== "string" || typeof value.user?.name !== "string"
      || typeof value.user?.email !== "string" || typeof value.context?.id !== "string"
      || value.context.kind !== "personal" || value.context.tenant_id !== null
      || value.context.membership_id !== null) return null;
    return { user: value.user, contexts: [value.context] };
  }

  async clear(): Promise<void> { await this.mutate(() => this.storage.remove()); }

  private mutate(action: () => Promise<void>): Promise<void> {
    const operation = this.pending.then(action);
    this.pending = operation.catch(() => {});
    return operation;
  }
}
