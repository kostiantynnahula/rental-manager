import type { Prisma } from '../../generated/prisma/client.js';
import type { UtilityType } from '../../generated/prisma/enums.js';

// One meter's share of a metered line.
export interface StatementLineMeter {
  meterId: string;
  utility: UtilityType;
  label: string | null;
  serialNumber: string | null;
  consumption: Prisma.Decimal;
  // Photos of the readings behind this consumption (distinct, in row order).
  photoIds: string[];
}
