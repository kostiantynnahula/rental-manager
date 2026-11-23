import type { RerankResult } from '../interfaces/rerank-result.interface.js';

// Voyage's `{ data: [{ index, relevance_score }] }`, one entry per document; null if anything is off.
export function parseRerankResponse(body: unknown, count: number): RerankResult[] | null {
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data) || data.length !== count) return null;
  const results: RerankResult[] = [];
  for (const item of data as ({ index?: unknown; relevance_score?: unknown } | null)[]) {
    const index = item?.index;
    const score = item?.relevance_score;
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= count) {
      return null;
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) return null;
    results.push({ index, score });
  }
  return results;
}
