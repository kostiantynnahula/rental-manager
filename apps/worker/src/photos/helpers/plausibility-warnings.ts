import type { components } from '../../api/schema.js';
import { fromThousandths } from './from-thousandths.js';
import { MONTHLY_LIMITS } from './monthly-limits.js';
import { monthsBetween } from './months-between.js';
import { toThousandths } from './to-thousandths.js';

type Meter = components['schemas']['MeterResponseDto'];
type Zone = components['schemas']['Zone'];

// Soft checks against the meter's last CONFIRMED reading (Ukrainian: they end up in the draft's note on the review
// screen). Never block the draft — the human decides.
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
  const limit = MONTHLY_LIMITS[meter.utility];
  if (diff > BigInt(limit * months) * 1000n) {
    return [
      `споживання ${fromThousandths(diff)} за ${months} міс. — більше за звичні ${limit}/міс.`,
    ];
  }
  return [];
}
