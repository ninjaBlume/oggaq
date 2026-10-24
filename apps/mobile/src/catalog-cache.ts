// Short-lived, bounded memory cache for central catalog metadata, keyed by context and filters.
// Personal history, attempts, answer keys and authentication never enter this cache.
export class CatalogCache {
  private entries = new Map<string, { at: number; value: unknown }>();
  constructor(private maxAge = 60_000, private limit = 12) {}
  async read<T>(key: string, signal: AbortSignal, load: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key);
    if (cached && Date.now() - cached.at < this.maxAge) return cached.value as T;
    const value = await load();
    if (!signal.aborted) {
      this.entries.delete(key);
      this.entries.set(key, { at: Date.now(), value });
      if (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value!);
    }
    return value;
  }
}
