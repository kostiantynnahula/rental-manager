import type { Prisma } from '../../generated/prisma/client.js';
import type { Zone } from '../../generated/prisma/enums.js';

// A row of the reading_consumption view for the statement's period.
export interface StatementConsumptionRow {
  meterId: string;
  zone: Zone;
  // null when the meter/zone has no previous confirmed value (a meter's INITIAL reading).
  consumption: Prisma.Decimal | null;
  // Period of the previous confirmed value of the meter/zone (null with consumption null): the gap between readings.
  previousPeriod: Date | null;
  // Photo of the value behind the row, if it was read from one.
  photoId: string | null;
}
