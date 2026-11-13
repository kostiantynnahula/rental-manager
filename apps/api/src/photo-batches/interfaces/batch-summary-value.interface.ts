import type { Prisma } from '../../generated/prisma/client.js';
import type { Zone } from '../../generated/prisma/enums.js';
import type { BatchSummaryWarning } from './batch-summary-warning.interface.js';

export interface BatchSummaryValue {
  zone: Zone;
  value: Prisma.Decimal;
  photoId: string | null;
  // The previous CONFIRMED value of the meter and zone; null (with consumption) if there is none.
  previousValue: Prisma.Decimal | null;
  consumption: Prisma.Decimal | null;
  lowerThanPrevious: boolean;
  warnings: BatchSummaryWarning[];
}
