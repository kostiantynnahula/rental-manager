import type { UIMessageChunk } from 'ai';
import {
  photoMarkerFilter,
  sourcesInOrder,
  splitAtPartialMarker,
  stripUnknownMarkers,
} from './sources.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

describe('stripUnknownMarkers', () => {
  it('keeps markers whose id a tool returned', () => {
    const text = `Мийка [[photo:${A}]] ок`;
    expect(stripUnknownMarkers(text, new Set([A]))).toBe(text);
  });

  it('removes markers with other ids', () => {
    expect(stripUnknownMarkers(`a [[photo:${B}]] b`, new Set([A]))).toBe('a  b');
  });

  it('removes every marker when nothing was returned', () => {
    expect(stripUnknownMarkers(`[[photo:${A}]][[photo:${B}]]`, new Set())).toBe('');
  });

  it('leaves text without markers alone', () => {
    expect(stripUnknownMarkers('просто [текст] [[не фото]]', new Set([A]))).toBe(
      'просто [текст] [[не фото]]',
    );
  });
});

describe('sourcesInOrder', () => {
  it('lists kept ids by first mention, once each', () => {
    const texts = [`x [[photo:${B}]] [[photo:${A}]]`, `y [[photo:${B}]] [[photo:${C}]]`];
    expect(sourcesInOrder(texts, new Set([A, B, C]))).toEqual([B, A, C]);
  });

  it('skips ids that no tool returned', () => {
    expect(sourcesInOrder([`[[photo:${B}]] [[photo:${A}]]`], new Set([A]))).toEqual([A]);
  });

  it('is empty without markers', () => {
    expect(sourcesInOrder(['нічого'], new Set([A]))).toEqual([]);
  });
});

describe('splitAtPartialMarker', () => {
  it('holds back an unclosed marker start', () => {
    expect(splitAtPartialMarker('текст [[photo:11')).toEqual(['текст ', '[[photo:11']);
  });

  it('holds back a lone trailing bracket', () => {
    expect(splitAtPartialMarker('текст [')).toEqual(['текст ', '[']);
  });

  it('releases a closed marker', () => {
    expect(splitAtPartialMarker('a [[photo:x]] b')).toEqual(['a [[photo:x]] b', '']);
  });

  it('releases a too-long "[[" that cannot become a marker', () => {
    const text = `[[${'x'.repeat(60)}`;
    expect(splitAtPartialMarker(text)).toEqual([text, '']);
  });
});

async function run(chunks: UIMessageChunk[], allowed: Set<string>): Promise<UIMessageChunk[]> {
  const out: UIMessageChunk[] = [];
  const stream = new ReadableStream<UIMessageChunk>({
    start(c) {
      chunks.forEach((x) => c.enqueue(x));
      c.close();
    },
  }).pipeThrough(photoMarkerFilter(allowed));
  for await (const chunk of stream) out.push(chunk);
  return out;
}

const text = (id: string, ...deltas: string[]): UIMessageChunk[] => [
  { type: 'text-start', id },
  ...deltas.map((delta): UIMessageChunk => ({ type: 'text-delta', id, delta })),
  { type: 'text-end', id },
];

const joined = (chunks: UIMessageChunk[]): string =>
  chunks.map((c) => (c.type === 'text-delta' ? c.delta : '')).join('');

describe('photoMarkerFilter', () => {
  it('strips a foreign marker and keeps an allowed one', async () => {
    const out = await run(text('t', `a [[photo:${B}]] b [[photo:${A}]] c`), new Set([A]));
    expect(joined(out)).toBe(`a  b [[photo:${A}]] c`);
  });

  it('strips a foreign marker split across deltas', async () => {
    const out = await run(text('t', 'a [[pho', `to:${B}]] b`), new Set([A]));
    expect(joined(out)).toBe('a  b');
  });

  it('keeps an allowed marker split across deltas', async () => {
    const out = await run(text('t', 'a [[photo:', `${A}`, ']] b'), new Set([A]));
    expect(joined(out)).toBe(`a [[photo:${A}]] b`);
  });

  it('passes non-text chunks through', async () => {
    const out = await run(text('t', 'hi'), new Set());
    expect(out.map((c) => c.type)).toEqual(['text-start', 'text-delta', 'text-end']);
  });

  it('flushes a held tail when the text ends', async () => {
    const out = await run(text('t', 'ціна [[ще'), new Set());
    expect(joined(out)).toBe('ціна [[ще');
  });

  it('reads the allowed set at each delta (tool results arrive first)', async () => {
    const allowed = new Set<string>();
    const out: UIMessageChunk[] = [];
    const source = new TransformStream<UIMessageChunk, UIMessageChunk>();
    const writer = source.writable.getWriter();
    const reader = source.readable.pipeThrough(photoMarkerFilter(allowed)).getReader();
    const collect = (async () => {
      for (;;) {
        const r = await reader.read();
        if (r.done) return;
        out.push(r.value);
      }
    })();
    await writer.write({ type: 'text-start', id: 't' });
    allowed.add(A);
    await writer.write({ type: 'text-delta', id: 't', delta: `[[photo:${A}]]` });
    await writer.write({ type: 'text-end', id: 't' });
    await writer.close();
    await collect;
    expect(joined(out)).toBe(`[[photo:${A}]]`);
  });
});
