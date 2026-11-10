import {
  consumptionLimit,
  consumptionWarnings,
  fromThousandths,
  toThousandths,
} from '@rental/shared';
import { monthsBetween, periodEnd } from '../../common/helpers/period.js';
import { Prisma } from '../../generated/prisma/client.js';
import { TariffKind, UtilityType, Zone } from '../../generated/prisma/enums.js';
import { priceForPeriod } from '../../tariffs/helpers/price-for-period.js';
import {
  RENT_LINE_NAME,
  STATEMENT_UTILITY_ORDER,
  STATEMENT_ZONE_ORDER,
} from '../constants/statement.js';
import type { StatementAttachment } from '../interfaces/statement-attachment.interface.js';
import type { StatementInput } from '../interfaces/statement-input.interface.js';
import type { StatementLease } from '../interfaces/statement-lease.interface.js';
import type { StatementLineMeter } from '../interfaces/statement-line-meter.interface.js';
import type { StatementLine } from '../interfaces/statement-line.interface.js';
import type { StatementMeter } from '../interfaces/statement-meter.interface.js';
import type { StatementPreview } from '../interfaces/statement-preview.interface.js';
import type { StatementWarning } from '../interfaces/statement-warning.interface.js';

type Tariff = StatementAttachment['tariff'];

const ZERO = new Prisma.Decimal(0);

// Integer kopiyky, half-up. Rounded as Decimal: never a float before the rounding.
function toKopiyky(quantity: Prisma.Decimal, unitPrice: Prisma.Decimal): number {
  return quantity
    .mul(unitPrice)
    .mul(100)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
    .toNumber();
}

function sum(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((acc, v) => acc.plus(v), ZERO);
}

function firstUtilityIndex(utilities: UtilityType[]): number {
  return Math.min(...utilities.map((u) => STATEMENT_UTILITY_ORDER.indexOf(u)));
}

function byName(a: Tariff, b: Tariff): number {
  return a.name.localeCompare(b.name, 'uk');
}

// Whole month: a lease overlapping the period bills its full rent. Two leases in one month need a human decision.
function rentLines(leases: StatementLease[], warnings: StatementWarning[]): StatementLine[] {
  if (leases.length > 1) warnings.push({ code: 'MULTIPLE_LEASES' });
  if (leases.length !== 1) return [];
  const quantity = new Prisma.Decimal(1);
  const unitPrice = new Prisma.Decimal(leases[0].monthlyRent).div(100);
  return [
    {
      type: 'RENT',
      name: RENT_LINE_NAME,
      quantity,
      unitPrice,
      amount: toKopiyky(quantity, unitPrice),
    },
  ];
}

function fixedLine(
  tariff: Tariff,
  period: Date,
  warnings: StatementWarning[],
): StatementLine | undefined {
  const price = priceForPeriod(tariff.prices, period, Zone.TOTAL);
  if (!price) {
    warnings.push({
      code: 'NO_PRICE',
      tariffId: tariff.id,
      tariffName: tariff.name,
      zone: Zone.TOTAL,
    });
    return undefined;
  }
  const quantity = new Prisma.Decimal(1);
  return {
    type: 'FIXED',
    tariffId: tariff.id,
    name: tariff.name,
    quantity,
    unitPrice: price.price,
    amount: toKopiyky(quantity, price.price),
  };
}

// One meter's consumption in a zone; undefined when it has none (no row, or only its INITIAL reading).
// A meter can have several rows in a month (INITIAL + REGULAR, REGULAR + FINAL).
function meterShare(
  meter: StatementMeter,
  zone: Zone,
  consumption: StatementInput['consumption'],
): StatementLineMeter | undefined {
  const rows = consumption.filter(
    (r) => r.meterId === meter.id && r.zone === zone && r.consumption !== null,
  );
  const values = rows.map((r) => r.consumption as Prisma.Decimal);
  if (values.length === 0) return undefined;
  return {
    meterId: meter.id,
    utility: meter.utility,
    label: meter.label,
    serialNumber: meter.serialNumber,
    consumption: sum(values),
    photoIds: [...new Set(rows.flatMap((r) => r.photoId ?? []))],
  };
}

// One line per zone over all the tariff's meters: covers replaced meters and multi-utility tariffs (drainage).
function meteredLines(
  tariff: Tariff,
  activeMeters: StatementMeter[],
  input: StatementInput,
  warnings: StatementWarning[],
): StatementLine[] {
  const meters = activeMeters.filter((m) => tariff.utilities.includes(m.utility));
  if (meters.length === 0) {
    warnings.push({ code: 'NO_METERS', tariffId: tariff.id, tariffName: tariff.name });
    return [];
  }
  return STATEMENT_ZONE_ORDER.flatMap((zone) => {
    const shares = meters.flatMap((m) => meterShare(m, zone, input.consumption) ?? []);
    if (shares.length === 0) return [];
    const price = priceForPeriod(tariff.prices, input.period, zone);
    if (!price) {
      warnings.push({ code: 'NO_PRICE', tariffId: tariff.id, tariffName: tariff.name, zone });
      return [];
    }
    const quantity = sum(shares.map((s) => s.consumption));
    return [
      {
        type: 'METERED' as const,
        tariffId: tariff.id,
        name: tariff.name,
        zone,
        utilities: tariff.utilities,
        quantity,
        unitPrice: price.price,
        amount: toKopiyky(quantity, price.price),
        meters: shares,
      },
    ];
  });
}

// A billed meter without a single row in the period. A meter with only its INITIAL reading has a row: it was just
// installed, nothing to bill yet. Reported once per meter, even when two tariffs bill it (water + drainage).
function missingReadings(
  tariffs: Tariff[],
  activeMeters: StatementMeter[],
  input: StatementInput,
): StatementWarning[] {
  return activeMeters
    .filter(
      (m) =>
        tariffs.some((t) => t.utilities.includes(m.utility)) &&
        !input.consumption.some((r) => r.meterId === m.id),
    )
    .map((m) => ({
      code: 'MISSING_READING' as const,
      meterId: m.id,
      utility: m.utility,
      label: m.label,
    }));
}

// Consumption off the shared limits (or zero electricity while a lease covers the period), once per billed meter +
// zone — the same rows as the bill (meterShare). months = from the earliest previous reading behind those rows.
function unusualConsumption(
  tariffs: Tariff[],
  activeMeters: StatementMeter[],
  input: StatementInput,
  hasLease: boolean,
): StatementWarning[] {
  const billed = activeMeters.filter((m) => tariffs.some((t) => t.utilities.includes(m.utility)));
  return billed.flatMap((meter) =>
    STATEMENT_ZONE_ORDER.flatMap((zone) => {
      const share = meterShare(meter, zone, input.consumption);
      if (!share) return [];
      const previous = input.consumption
        .filter((r) => r.meterId === meter.id && r.zone === zone && r.consumption !== null)
        .flatMap((r) => r.previousPeriod ?? [])
        .reduce<Date | null>((min, p) => (min === null || p < min ? p : min), null);
      const months = Math.max(1, previous ? monthsBetween(previous, input.period) : 1);
      // toFixed never uses exponent notation; the round trip drops trailing zeros ("340.000" → "340").
      const consumption = fromThousandths(toThousandths(share.consumption.toFixed()));
      const reasons = consumptionWarnings({
        utility: meter.utility,
        zone,
        consumption,
        months,
        hasLease,
      });
      return reasons.map((reason) => ({
        code: 'UNUSUAL_CONSUMPTION' as const,
        meterId: meter.id,
        utility: meter.utility,
        label: meter.label,
        zone,
        consumption,
        limit: consumptionLimit(meter.utility, zone) ?? undefined,
        months,
        reason,
      }));
    }),
  );
}

// The monthly calculation as a pure function: no database, nothing written. Lines: rent, then metered by utility
// and zone, then fixed by name.
export function calculateStatement(input: StatementInput): StatementPreview {
  const { period } = input;
  const warnings: StatementWarning[] = [];
  const tariffs = input.attachments
    .filter((a) => a.activeFrom <= period && (a.activeTo === null || a.activeTo >= period))
    .map((a) => a.tariff);
  const activeMeters = input.meters.filter(
    (m) => m.installedAt <= periodEnd(period) && (m.removedAt === null || m.removedAt >= period),
  );
  const leases = input.leases.filter(
    (l) => l.startDate <= periodEnd(period) && (l.endDate === null || l.endDate >= period),
  );
  const metered = tariffs
    .filter((t) => t.kind === TariffKind.METERED)
    .sort(
      (a, b) => firstUtilityIndex(a.utilities) - firstUtilityIndex(b.utilities) || byName(a, b),
    );
  const fixed = tariffs.filter((t) => t.kind === TariffKind.FIXED).sort(byName);

  const lines = [
    ...rentLines(leases, warnings),
    ...metered.flatMap((t) => meteredLines(t, activeMeters, input, warnings)),
    ...fixed.flatMap((t) => fixedLine(t, period, warnings) ?? []),
  ];
  warnings.push(...missingReadings(metered, activeMeters, input));
  warnings.push(...unusualConsumption(metered, activeMeters, input, leases.length > 0));
  return {
    lines,
    total: lines.reduce((acc, l) => acc + l.amount, 0),
    warnings,
    leaseId: leases.length === 1 ? leases[0].id : undefined,
  };
}
