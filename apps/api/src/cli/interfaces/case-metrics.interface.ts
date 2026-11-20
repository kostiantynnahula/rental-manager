export interface CaseMetrics {
  recallAt5: number;
  recallAt10: number;
  // 1 / rank of the first expected photo, 0 if none in the results.
  reciprocalRank: number;
  // 1-based ranks of the expected photos that were found, ascending.
  foundRanks: number[];
  missed: number;
}
