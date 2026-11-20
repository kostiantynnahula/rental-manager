import type { CaseMetrics } from '../interfaces/case-metrics.interface.js';

// Retrieval metrics of one case. `results` = photo ids in ranked order (best first); `expected` = the relevant ones.
//   recall@k = |expected ∩ top k| / |expected|;  RR = 1 / rank of the first relevant result (0 if none).
export function caseMetrics(results: string[], expected: string[]): CaseMetrics {
  const relevant = new Set(expected);
  const foundRanks = results.flatMap((id, i) => (relevant.has(id) ? [i + 1] : []));
  const recallAt = (k: number) => foundRanks.filter((rank) => rank <= k).length / relevant.size;
  return {
    recallAt5: recallAt(5),
    recallAt10: recallAt(10),
    reciprocalRank: foundRanks.length ? 1 / foundRanks[0] : 0,
    foundRanks,
    missed: relevant.size - foundRanks.length,
  };
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}
