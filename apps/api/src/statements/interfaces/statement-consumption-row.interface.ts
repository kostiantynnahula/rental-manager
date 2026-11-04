import type { Prisma } from '../../generated/prisma/client.js';
import type { Zone } from '../../generated/prisma/enums.js';

// A row of the reading_consumption view for the statement's period.
export interface StatementConsumptionRow {
  meterId: string;
  zone: Zone;
  // null when the meter/zone has no previous confirmed value (a meter's INITIAL reading).
  consumption: Prisma.Decimal | null;
}
