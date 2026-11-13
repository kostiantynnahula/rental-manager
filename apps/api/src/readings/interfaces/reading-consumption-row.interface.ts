import type { Prisma } from '../../generated/prisma/client.js';
import type { Zone } from '../../generated/prisma/enums.js';

// A reading's value with its previous confirmed value (helpers/reading-consumption-sql.ts, from the
// reading_consumption view).
export interface ReadingConsumptionRow {
  readingId: string;
  zone: Zone;
  value: Prisma.Decimal;
  // null when the meter/zone has no previous confirmed value (e.g. INITIAL).
  consumption: Prisma.Decimal | null;
  previousValue: Prisma.Decimal | null;
  // The previous value's period (1st of the month); null with it.
  previousPeriod: Date | null;
}
