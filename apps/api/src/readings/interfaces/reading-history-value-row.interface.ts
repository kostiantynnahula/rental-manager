import type { ReadingSource } from '../../generated/prisma/enums.js';
import type { ReadingConsumptionRow } from './reading-consumption-row.interface.js';

// A history value: the reading_consumption view row plus the value's photo and source (from reading_values).
// The history query doesn't select previousValue.
export interface ReadingHistoryValueRow extends Omit<ReadingConsumptionRow, 'previousValue'> {
  photoId: string | null;
  source: ReadingSource;
}
