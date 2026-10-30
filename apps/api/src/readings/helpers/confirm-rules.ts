import { formatDateOnly } from '../../common/helpers/date-only.js';
import { addMonths, formatPeriod, periodEnd } from '../../common/helpers/period.js';
import { ReadingKind } from '../../generated/prisma/enums.js';
import type { ConfirmRulesInput } from '../interfaces/confirm-rules-input.interface.js';
import type { RuleViolation } from '../interfaces/rule-violation.interface.js';
import { decreasedZones, exceededZones } from './decreased-values.js';
import { findNextConfirmed, findPreviousConfirmed } from './reading-order.js';
import { zonesMismatch } from './zones.js';

export const DUPLICATE_CONFIRMED_PERIOD =
  'A confirmed reading for this period already exists — cancel it first';

// Everything that must hold before a REGULAR reading becomes CONFIRMED. Pure: all data comes in
// through `input` (incl. today), nothing is read from the DB. Empty result = OK.
export function checkConfirmRules(input: ConfirmRulesInput): RuleViolation[] {
  const { meter, candidate, confirmed, today } = input;
  const violations: RuleViolation[] = [];
  const bad = (message: string) => violations.push({ conflict: false, message });
  const conflict = (message: string) => violations.push({ conflict: true, message });

  // 1. Zones match the meter.
  const mismatch = zonesMismatch(meter.zoneScheme, candidate.values);
  if (mismatch) bad(mismatch);

  // 2. Meter installed and not removed; date within installedAt..today.
  if (meter.removedAt) conflict('Meter is removed');
  if (candidate.readingDate < meter.installedAt) {
    bad(
      `readingDate must not be before the meter was installed (${formatDateOnly(meter.installedAt)})`,
    );
  }
  if (candidate.readingDate > today) bad('readingDate must not be in the future');

  // 3. Reading window: from the 1st of the period to the end of the following month.
  const windowEnd = periodEnd(addMonths(candidate.period, 1));
  if (candidate.readingDate < candidate.period || candidate.readingDate > windowEnd) {
    bad(
      `readingDate for period ${formatPeriod(candidate.period)} must be between ` +
        `${formatDateOnly(candidate.period)} and ${formatDateOnly(windowEnd)}`,
    );
  }

  // 4. Values fit between the neighbouring confirmed readings (skip if zones are wrong anyway).
  if (!mismatch) {
    const target = {
      id: candidate.id,
      kind: ReadingKind.REGULAR,
      readingDate: candidate.readingDate,
    };
    const previous = findPreviousConfirmed(confirmed, target);
    const next = findNextConfirmed(confirmed, target);
    const lower = decreasedZones(previous?.values ?? [], candidate.values);
    if (lower.length > 0) {
      bad(`values must not be lower than the previous confirmed reading: ${lower.join('; ')}`);
    }
    const higher = exceededZones(next?.values ?? [], candidate.values);
    if (higher.length > 0) {
      bad(`values must not be higher than the next confirmed reading: ${higher.join('; ')}`);
    }
  }

  // 5. One confirmed REGULAR per meter and period (DB index readings_one_confirmed_regular_per_period).
  const duplicate = confirmed.some(
    (r) =>
      r.id !== candidate.id &&
      r.kind === ReadingKind.REGULAR &&
      r.period.getTime() === candidate.period.getTime(),
  );
  if (duplicate) conflict(DUPLICATE_CONFIRMED_PERIOD);

  return violations;
}
