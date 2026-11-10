import { toThousandths } from './decimal.js';

// Same values as the API's UtilityType / Zone enums (shared never imports the generated API types).
export type Utility = 'ELECTRICITY' | 'COLD_WATER' | 'HOT_WATER' | 'GAS';
export type MeterZone = 'TOTAL' | 'DAY' | 'NIGHT';
export type ConsumptionWarning = 'ABOVE_LIMIT' | 'ZERO_CONSUMPTION';

// Usual consumption per month for one apartment, per utility + zone — the one place to tune them. Static on purpose
// (history averages break on new tenants, meter replacements, vacations). Above → a warning, never a block.
export const CONSUMPTION_LIMITS = {
  ELECTRICITY: { DAY: 130, NIGHT: 70, TOTAL: 200 }, // kWh (TOTAL = single-zone meter)
  COLD_WATER: { TOTAL: 20 }, // m³
  HOT_WATER: { TOTAL: 20 }, // m³
  GAS: { TOTAL: 20 }, // m³
} as const satisfies Record<Utility, Partial<Record<MeterZone, number>>>;

// Monthly limit for a utility + zone; null when the zone doesn't exist on that utility (no limit check).
export function consumptionLimit(utility: Utility, zone: MeterZone): number | null {
  const limits: Partial<Record<MeterZone, number>> = CONSUMPTION_LIMITS[utility];
  return limits[zone] ?? null;
}

export interface ConsumptionInput {
  utility: Utility;
  zone: MeterZone;
  // Decimal string (e.g. "131.5"), exact — no JS number math.
  consumption: string;
  // Months since the previous reading (a gap → the limit scales); < 1 counts as 1.
  months: number;
  // A lease covers the period: zero electricity is then suspicious (empty apartment → fridge off → zero is expected).
  hasLease: boolean;
}

// Soft checks on one zone's consumption → warning codes (empty = fine). Callers word them; they never block.
export function consumptionWarnings(input: ConsumptionInput): ConsumptionWarning[] {
  const value = toThousandths(input.consumption);
  const warnings: ConsumptionWarning[] = [];
  const limit = consumptionLimit(input.utility, input.zone);
  const months = BigInt(Math.max(1, Math.floor(input.months)));
  if (limit !== null && value > BigInt(limit) * months * 1000n) warnings.push('ABOVE_LIMIT');
  if (input.utility === 'ELECTRICITY' && value === 0n && input.hasLease) {
    warnings.push('ZERO_CONSUMPTION');
  }
  return warnings;
}
