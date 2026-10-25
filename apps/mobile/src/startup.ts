export type Prepared<T> = Promise<{ data: T } | { error: unknown }>;

// Preferences, storage probes and identity never serialize unrelated work.
// Identity still has to succeed before the caller can show the workspace.
export async function restoreApplication<T>(steps: {
  probe: () => Promise<void>;
  restore: () => Promise<boolean>;
  contexts: () => Promise<T>;
  prepared: (contexts: Prepared<T>) => void;
  identity: () => Promise<void>;
}) {
  const [, restored] = await Promise.all([steps.probe(), steps.restore()]);
  if (!restored) return;
  const contexts = steps.contexts().then(data => ({ data }), error => ({ error }));
  steps.prepared(contexts);
  await steps.identity();
}
