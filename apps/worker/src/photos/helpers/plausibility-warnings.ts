import {
  consumptionLimit,
  consumptionWarnings,
  fromThousandths,
  toThousandths,
} from '@rental/shared';
import type { components } from '../../api/schema.js';
import { monthsBetween } from './months-between.js';

type Meter = components['schemas']['MeterResponseDto'];
type Zone = components['schemas']['Zone'];

// Soft checks against the meter's last CONFIRMED reading (Ukrainian: they end up in the draft's note on the review
// screen). Never block the draft — the human decides. The limits are the shared rule (`consumptionWarnings`);
// hasLease: false — the worker can't see leases, zero electricity is flagged on the statement instead.
export function plausibilityWarnings(
  meter: Meter,
  zone: Zone,
  value: string,
  period: string,
): string[] {
  const last = meter.lastReading?.values.find((v) => v.zone === zone);
  if (!meter.lastReading || !last) return [];
  const diff = toThousandths(value) - toThousandths(last.value);
  if (diff < 0n) return [`менше за останнє підтверджене (${value} < ${last.value})`];
  const months = Math.max(1, monthsBetween(meter.lastReading.period, period));
  const consumption = fromThousandths(diff);
  const codes = consumptionWarnings({
    utility: meter.utility,
    zone,
    consumption,
    months,
    hasLease: false,
  });
  if (codes.includes('ABOVE_LIMIT')) {
    const limit = consumptionLimit(meter.utility, zone);
    return [`споживання ${consumption} за ${months} міс. — більше за звичні ${limit}/міс.`];
  }
  return [];
}
