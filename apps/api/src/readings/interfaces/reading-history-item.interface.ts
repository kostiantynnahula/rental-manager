import type { ConsumptionWarning } from '@rental/shared';
import type { ReadingHistoryRow } from './reading-history-row.interface.js';
import type { ReadingHistoryValueRow } from './reading-history-value-row.interface.js';

export interface ReadingHistoryItem {
  reading: ReadingHistoryRow;
  values: (ReadingHistoryValueRow & { warnings: ConsumptionWarning[] })[];
}
