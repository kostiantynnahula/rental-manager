import type { ReadingSource } from '../../generated/prisma/enums.js';
import type { ReadingConsumptionRow } from './reading-consumption-row.interface.js';

// A history value: the reading_consumption view row plus the value's photo and source (from reading_values).
export interface ReadingHistoryValueRow extends ReadingConsumptionRow {
  photoId: string | null;
  source: ReadingSource;
  // Period of the previous confirmed value of the meter/zone (null with consumption null).
  previousPeriod: Date | null;
}
