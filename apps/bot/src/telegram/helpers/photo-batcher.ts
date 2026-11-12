// In-memory debounce buffer: items with one key are collected until `silenceMs` pass without a new one, then
// handed to `onFlush` together. Telegram sends every photo of an album as a separate update, so this is what
// turns them into one batch (and one reply). Single process only: nothing survives a restart — so it only holds
// what is already safe (upload results, not photos).
export class PhotoBatcher<T> {
  private readonly pending = new Map<string, { items: T[]; timer: NodeJS.Timeout }>();

  constructor(
    private readonly silenceMs: number,
    private readonly onFlush: (items: T[]) => void,
  ) {}

  add(key: string, item: T): void {
    const batch = this.pending.get(key);
    if (batch) clearTimeout(batch.timer);
    const items = batch ? [...batch.items, item] : [item];
    const timer = setTimeout(() => this.flush(key), this.silenceMs);
    this.pending.set(key, { items, timer });
  }

  // Stops the key's silence timer (its items stay) while the next item is being produced, e.g. uploaded: that can
  // take longer than `silenceMs`, and the album must not be split. The next add() restarts the timer.
  hold(key: string): void {
    const batch = this.pending.get(key);
    if (batch) clearTimeout(batch.timer);
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
