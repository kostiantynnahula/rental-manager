import type { RerankResult } from '../interfaces/rerank-result.interface.js';

// Voyage's `{ data: [{ index, relevance_score }] }`, one entry per document (each index once); null if
// anything is off.
export function parseRerankResponse(body: unknown, count: number): RerankResult[] | null {
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data) || data.length !== count) return null;
  const results: RerankResult[] = [];
  const seen = new Set<number>();
  for (const item of data as ({ index?: unknown; relevance_score?: unknown } | null)[]) {
    const index = item?.index;
    const score = item?.relevance_score;
    if (
      typeof index !== 'number' ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= count ||
      seen.has(index)
    ) {
      return null;
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) return null;
    seen.add(index);
    results.push({ index, score });
  }
  return results;
}
