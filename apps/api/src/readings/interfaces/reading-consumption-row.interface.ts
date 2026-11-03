import type { Prisma } from '../../generated/prisma/client.js';
import type { Zone } from '../../generated/prisma/enums.js';

// A row of the reading_consumption view (only the columns the history needs).
export interface ReadingConsumptionRow {
  readingId: string;
  zone: Zone;
  value: Prisma.Decimal;
  // null when the meter/zone has no previous confirmed value (e.g. INITIAL).
  consumption: Prisma.Decimal | null;
}
