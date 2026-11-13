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

// Months the consumption covers: since the previous reading's period, at least 1.
export function monthsSincePrevious(previousPeriod: Date | null, period: Date): number {
  return Math.max(1, previousPeriod ? monthsBetween(previousPeriod, period) : 1);
}

// One history value through the shared consumption rule (the same as the statement's UNUSUAL_CONSUMPTION).
export function historyValueWarnings(input: HistoryValueWarningsInput): ConsumptionWarning[] {
  if (input.consumption === null) return [];
  return consumptionWarnings({
    utility: input.utility,
    zone: input.zone,
    consumption: consumptionString(input.consumption),
    months: monthsSincePrevious(input.previousPeriod, input.period),
    hasLease: input.leases.some((l) => leaseOverlapsPeriod(l, input.period)),
  });
}
