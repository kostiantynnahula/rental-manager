import type { ConsumptionWarning } from '@rental/shared';

// A consumption warning with what the client needs to word it ("Спожито X за N міс. — більше за звичні L/міс.").
export interface BatchSummaryWarning {
  code: ConsumptionWarning;
  // The monthly limit of the utility + zone (ABOVE_LIMIT); null for ZERO_CONSUMPTION.
  limit: number | null;
  // Months since the previous reading (≥ 1).
  months: number;
}
