// Consumption warnings on screen: the shared rule (@rental/shared, the same one the API uses for statements and the
// history), worded in Ukrainian. Values stay decimal strings — the difference is BigInt thousandths, never floats.
import {
  consumptionLimit,
  consumptionWarnings,
  fromThousandths,
  toThousandths,
  type ConsumptionWarning,
} from '@rental/shared';
import { compareMeterValues, normalizeMeterValue } from '@/lib/meter-values';
import { isPeriod, monthsBetween } from '@/lib/period';
import { UTILITY_UNITS, type UtilityType, type Zone } from '@/lib/utilities';

// "Спожито 340 кВт·год за 3 міс. — більше за звичні 130/міс." / "Нульове споживання, хоча є договір".
// Without `consumption` (the history only knows the code): "Більше за звичні 130/міс.".
export function consumptionWarningText(
  utility: UtilityType,
  zone: Zone,
  reason: ConsumptionWarning,
  detail: { consumption?: string; months?: number } = {},
): string {
  if (reason === 'ZERO_CONSUMPTION') return 'Нульове споживання, хоча є договір';
  const usual = `звичні ${consumptionLimit(utility, zone)}/міс.`;
  if (detail.consumption === undefined) return `Більше за ${usual}`;
  const months = detail.months && detail.months > 1 ? ` за ${detail.months} міс.` : '';
  const consumption = detail.consumption.replace('.', ',');
  return `Спожито ${consumption} ${UTILITY_UNITS[utility]}${months} — більше за ${usual}`;
}

interface LiveConsumptionInput {
  utility: UtilityType;
  zone: Zone;
  // What's typed in the field ("1520,35"); not a meter value yet → no warning.
  input: string;
  // The zone's last confirmed value and its period ("YYYY-MM").
  previous: string;
  previousPeriod: string;
  period: string;
  hasLease: boolean;
}

// The warnings for a value being typed, as text (empty = fine). A lower value is a validation error, not a warning.
export function liveConsumptionWarnings(input: LiveConsumptionInput): string[] {
  const value = normalizeMeterValue(input.input);
  const previous = normalizeMeterValue(input.previous);
  if (value === null || previous === null || !isPeriod(input.period)) return [];
  // No BigInt literals here (the web's TS target is below ES2020).
  if (compareMeterValues(value, previous) < 0) return [];
  const consumption = fromThousandths(toThousandths(value) - toThousandths(previous));
  const months = Math.max(1, monthsBetween(input.previousPeriod, input.period));
  return consumptionWarnings({
    utility: input.utility,
    zone: input.zone,
    consumption,
    months,
    hasLease: input.hasLease,
  }).map((reason) =>
    consumptionWarningText(input.utility, input.zone, reason, { consumption, months }),
  );
}
