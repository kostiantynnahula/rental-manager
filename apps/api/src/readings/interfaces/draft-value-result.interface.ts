import type { ReadingWithConsumption } from './reading-with-consumption.interface.js';

// POST /meters/:meterId/draft-values: the draft, and whether it was created (201) or merged into / unchanged (200).
export interface DraftValueResult {
  entry: ReadingWithConsumption;
  created: boolean;
}
