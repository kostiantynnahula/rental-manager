import { consumptionWarnings, type ConsumptionWarning } from '@rental/shared';
import { consumptionString } from '../../common/helpers/consumption-string.js';
import { leaseOverlapsPeriod, monthsBetween } from '../../common/helpers/period.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { UtilityType, Zone } from '../../generated/prisma/enums.js';

interface HistoryValueWarningsInput {
  utility: UtilityType;
  zone: Zone;
  // null without a previous confirmed value (a meter's INITIAL reading) → nothing to check.
  consumption: Prisma.Decimal | null;
  previousPeriod: Date | null;
  // The reading's period.
  period: Date;
  // All of the apartment's leases: zero electricity is suspicious only while one overlaps the period.
  leases: ReadonlyArray<{ startDate: Date; endDate: Date | null }>;
}

// One history value through the shared consumption rule (the same as the statement's UNUSUAL_CONSUMPTION).
export function historyValueWarnings(input: HistoryValueWarningsInput): ConsumptionWarning[] {
  if (input.consumption === null) return [];
  const months = input.previousPeriod ? monthsBetween(input.previousPeriod, input.period) : 1;
  return consumptionWarnings({
    utility: input.utility,
    zone: input.zone,
    consumption: consumptionString(input.consumption),
    months: Math.max(1, months),
    hasLease: input.leases.some((l) => leaseOverlapsPeriod(l, input.period)),
  });
}
