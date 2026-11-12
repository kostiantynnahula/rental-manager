// In-memory map whose entries expire after `ttlMs` (pruned on write). Bot state behind buttons lives here:
// single process, lost on restart — the buttons then say they are stale.
export class ExpiringMap<K, V> {
  private readonly entries = new Map<K, { value: V; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  set(key: K, value: V): void {
    const now = Date.now();
    for (const [k, e] of this.entries) if (e.expiresAt <= now) this.entries.delete(k);
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= Date.now()) return undefined;
    return entry.value;
  }

  delete(key: K): void {
    this.entries.delete(key);
  }
}
