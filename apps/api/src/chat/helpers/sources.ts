import type { UIMessageChunk } from 'ai';

// The agent cites a photo as [[photo:<id>]] (system prompt). Only ids that a tool returned in this run are kept: a
// marker with any other id (from memory, an earlier turn, made up) is cut out, so the web never links a photo the
// answer wasn't built on. Any id shape counts as a marker, so a made-up non-uuid one is cut too.
const MARKER = /\[\[photo:([^\]\s]+)\]\]/g;
const MARKER_START = '[[photo:';

export function stripUnknownMarkers(text: string, allowed: ReadonlySet<string>): string {
  return text.replace(MARKER, (marker, id: string) => (allowed.has(id) ? marker : ''));
}

// The kept ids by first mention (the order of the data-sources part).
export function sourcesInOrder(texts: readonly string[], allowed: ReadonlySet<string>): string[] {
  const ids = new Set<string>();
  for (const text of texts) {
    for (const [, id] of text.matchAll(MARKER)) if (allowed.has(id)) ids.add(id);
  }
  return [...ids];
}

// Every cited id by first mention, unknown ones included (chat:debug: cited − kept = stripped).
export function citedIds(texts: readonly string[]): string[] {
  const ids = new Set<string>();
  for (const text of texts) for (const [, id] of text.matchAll(MARKER)) ids.add(id);
  return [...ids];
}

// Splits streamed text into the part safe to send now and the tail that may still become a marker. Held only while
// it still can (no length cap: an id of any length is stripped), and flushed at the text part's end anyway.
export function splitAtPartialMarker(buffer: string): [ready: string, held: string] {
  const open = buffer.lastIndexOf('[[');
  if (open !== -1 && couldBecomeMarker(buffer.slice(open))) {
    return [buffer.slice(0, open), buffer.slice(open)];
  }
  if (buffer.endsWith('[')) return [buffer.slice(0, -1), '['];
  return [buffer, ''];
}

// "[[pho", "[[photo:ab12", "[[photo:ab12]": not closed yet, and nothing in it rules a marker out.
function couldBecomeMarker(tail: string): boolean {
  if (tail.length <= MARKER_START.length) return MARKER_START.startsWith(tail);
  return tail.startsWith(MARKER_START) && /^[^\]\s]*\]?$/.test(tail.slice(MARKER_START.length));
}

// Strips unknown markers from text deltas on the fly. `allowed` is read at each delta: tool results come before the
// text that cites them, so the ids are known by then. A possible marker split across deltas is held back until it
// closes, or until its text part ends.
export function photoMarkerFilter(
  allowed: ReadonlySet<string>,
): TransformStream<UIMessageChunk, UIMessageChunk> {
  const held = new Map<string, string>();
  const emit = (
    controller: TransformStreamDefaultController<UIMessageChunk>,
    id: string,
    text: string,
  ): void => {
    const delta = stripUnknownMarkers(text, allowed);
    if (delta) controller.enqueue({ type: 'text-delta', id, delta });
  };
  return new TransformStream({
    transform(chunk, controller) {
      if (chunk.type === 'text-delta') {
        const [ready, rest] = splitAtPartialMarker((held.get(chunk.id) ?? '') + chunk.delta);
        held.set(chunk.id, rest);
        emit(controller, chunk.id, ready);
        return;
      }
      if (chunk.type === 'text-end') {
        emit(controller, chunk.id, held.get(chunk.id) ?? '');
        held.delete(chunk.id);
      }
      controller.enqueue(chunk);
    },
    flush(controller) {
      // A text part the stream never ended (an error mid-answer).
      for (const [id, text] of held) emit(controller, id, text);
      held.clear();
    },
  });
}
