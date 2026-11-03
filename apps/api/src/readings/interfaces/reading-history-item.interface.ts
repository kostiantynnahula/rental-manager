import type { ReadingConsumptionRow } from './reading-consumption-row.interface.js';
import type { ReadingHistoryRow } from './reading-history-row.interface.js';

export interface ReadingHistoryItem {
  reading: ReadingHistoryRow;
  values: ReadingConsumptionRow[];
}
