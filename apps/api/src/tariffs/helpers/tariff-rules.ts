import { formatPeriod } from '../../common/helpers/period.js';
import { TariffKind, UtilityType, Zone } from '../../generated/prisma/enums.js';
import type { TariffPriceRow } from '../interfaces/tariff-price-row.interface.js';

// Pure tariff rules: each returns a problem message (undefined = fine); the service throws.

// One METERED tariff bills one unit: kWh (ELECTRICITY), m³ of gas (GAS) or m³ of water
// (COLD_WATER and/or HOT_WATER, e.g. drainage). FIXED bills a month and MANUAL an amount entered per statement:
// no utilities.
export function utilitiesProblem(kind: TariffKind, utilities: UtilityType[]): string | undefined {
  if (kind !== TariffKind.METERED) {
    return utilities.length ? `A ${kind} tariff must have no utilities` : undefined;
  }
  if (!utilities.length) return 'A METERED tariff needs at least one utility';
  const single = utilities.find((u) => u === UtilityType.ELECTRICITY || u === UtilityType.GAS);
  if (single && utilities.length > 1) {
    return `${single} can't be combined with other utilities (different units)`;
  }
  return undefined;
}

// MANUAL has no price: its amount is entered when the statement is calculated.
export function manualPricesProblem(kind: TariffKind, priceCount: number): string | undefined {
  return kind === TariffKind.MANUAL && priceCount > 0 ? 'A MANUAL tariff has no prices' : undefined;
}

// DAY/NIGHT prices only make sense for two-zone electricity meters.
export function disallowedZoneProblem(
  kind: TariffKind,
  utilities: UtilityType[],
  zones: Zone[],
): string | undefined {
  const zoned =
    kind === TariffKind.METERED &&
    utilities.length === 1 &&
    utilities[0] === UtilityType.ELECTRICITY;
  if (zoned) return undefined;
  const bad = zones.find((z) => z !== Zone.TOTAL);
  return bad ? `${bad} prices are only allowed for an ELECTRICITY tariff` : undefined;
}

// A zone without its own price falls back to TOTAL, so a TOTAL price must exist from the
// tariff's earliest month on.
export function totalCoverageProblem(prices: TariffPriceRow[]): string | undefined {
  const totals = prices.filter((p) => p.zone === Zone.TOTAL);
  if (!totals.length) return 'A tariff needs a TOTAL price';
  const earliest = Math.min(...prices.map((p) => p.effectiveFrom.getTime()));
  const earliestTotal = Math.min(...totals.map((p) => p.effectiveFrom.getTime()));
  return earliestTotal > earliest
    ? `The earliest month (${formatPeriod(new Date(earliest))}) needs a TOTAL price — other zones fall back to it`
    : undefined;
}

// Within one request body; the DB unique index covers rows already stored.
export function duplicatePriceProblem(prices: TariffPriceRow[]): string | undefined {
  const seen = new Set<string>();
  for (const p of prices) {
    const key = `${formatPeriod(p.effectiveFrom)} ${p.zone}`;
    if (seen.has(key)) return `Duplicate price for ${key}`;
    seen.add(key);
  }
  return undefined;
}
