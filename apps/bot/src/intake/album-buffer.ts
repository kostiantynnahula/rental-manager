// In-memory debounce buffer (pure: no Nest, no grammY). Items with one key are collected until `silenceMs` pass
// without a new one — or `maxItems` are there — then handed to `onFlush` together. Telegram sends every photo of
// an album as a separate update, so this is what turns them into one upload request (one batch).
// Single process only: a crash inside the window loses what is buffered (resending is safe: sha256 dedup).
export class AlbumBuffer<T> {
  private readonly pending = new Map<string, { items: T[]; timer: NodeJS.Timeout }>();

  constructor(
    private readonly silenceMs: number,
    private readonly maxItems: number,
    private readonly onFlush: (items: T[]) => void,
  ) {}

  add(key: string, item: T): void {
    const batch = this.pending.get(key);
    if (batch) clearTimeout(batch.timer);
    const items = batch ? [...batch.items, item] : [item];
    const timer = setTimeout(() => this.flush(key), this.silenceMs);
    this.pending.set(key, { items, timer });
    if (items.length >= this.maxItems) this.flush(key);
  }

  // Shutdown: hand over everything still waiting, without waiting for the silence.
  flushAll(): void {
    for (const key of [...this.pending.keys()]) this.flush(key);
  }

  private flush(key: string): void {
    const batch = this.pending.get(key);
    if (!batch) return;
    clearTimeout(batch.timer);
    this.pending.delete(key);
    this.onFlush(batch.items);
  }
}
