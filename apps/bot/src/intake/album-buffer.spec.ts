import { AlbumBuffer } from './album-buffer.js';

const SILENCE = 1_000;

function buffer(maxItems = 10) {
  const onFlush = vi.fn<(items: string[]) => void>();
  return { album: new AlbumBuffer<string>(SILENCE, maxItems, onFlush), onFlush };
}

describe('AlbumBuffer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes the items of a key after the silence', () => {
    const { album, onFlush } = buffer();
    album.add('chat-1', 'a');
    album.add('chat-1', 'b');
    vi.advanceTimersByTime(SILENCE - 1);
    expect(onFlush).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onFlush).toHaveBeenCalledExactlyOnceWith(['a', 'b']);
  });

  it('restarts the silence on each new item', () => {
    const { album, onFlush } = buffer();
    album.add('chat-1', 'a');
    vi.advanceTimersByTime(SILENCE - 1);
    album.add('chat-1', 'b');
    vi.advanceTimersByTime(SILENCE - 1);
    expect(onFlush).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onFlush).toHaveBeenCalledExactlyOnceWith(['a', 'b']);
  });

  it('flushes at once when maxItems are there, and starts a new batch after it', () => {
    const { album, onFlush } = buffer(2);
    album.add('chat-1', 'a');
    album.add('chat-1', 'b');
    expect(onFlush).toHaveBeenCalledExactlyOnceWith(['a', 'b']);

    album.add('chat-1', 'c');
    vi.advanceTimersByTime(SILENCE);
    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush).toHaveBeenLastCalledWith(['c']);
  });

  it('keeps keys apart', () => {
    const { album, onFlush } = buffer();
    album.add('chat-1', 'a');
    vi.advanceTimersByTime(SILENCE / 2);
    album.add('chat-2', 'b');
    vi.advanceTimersByTime(SILENCE / 2);
    expect(onFlush).toHaveBeenCalledExactlyOnceWith(['a']);
    vi.advanceTimersByTime(SILENCE / 2);
    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush).toHaveBeenLastCalledWith(['b']);
  });

  it('flushAll hands over every key at once and leaves no timer behind', () => {
    const { album, onFlush } = buffer();
    album.add('chat-1', 'a');
    album.add('chat-2', 'b');
    album.flushAll();
    expect(onFlush.mock.calls).toEqual([[['a']], [['b']]]);
    vi.advanceTimersByTime(SILENCE * 2);
    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('flushAll with nothing buffered does nothing', () => {
    const { album, onFlush } = buffer();
    album.flushAll();
    expect(onFlush).not.toHaveBeenCalled();
  });
});
