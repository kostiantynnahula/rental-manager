import {
  consumptionLimit,
  consumptionWarnings,
  toThousandths,
  type ConsumptionWarning,
} from '@rental/shared';
import type { components } from '../../api/schema.js';
import type {
  RenderedSummary,
  SummaryButton,
  SummaryEntry,
} from '../interfaces/summary-entry.interface.js';
import type { Meter, Reading } from '../results-api.service.js';
import {
  formatThousandths,
  UTILITY_ICONS,
  UTILITY_NAMES,
  UTILITY_ORDER,
  UTILITY_UNITS,
  ZONE_NAMES,
} from './labels.js';
import { monthsBetween } from './months-between.js';

type Utility = components['schemas']['UtilityType'];
type Zone = components['schemas']['Zone'];

// The parse results of a batch as one plain-text message + buttons (pure: the data is loaded by SummaryService).
// Grouped by apartment, then meter; one line per zone with the previous value and the consumption. Warnings use the
// shared rule (@rental/shared, as the web and the worker) and never block — the API decides on confirm.
export function renderSummary(entries: SummaryEntry[]): RenderedSummary {
  const lines: string[] = ['Результат розпізнавання:'];
  const buttons: SummaryButton[][] = [];
  const confirmable: string[] = [];

  const byApartment = new Map<string, SummaryEntry[]>();
  for (const e of entries) {
    byApartment.set(e.apartment.id, [...(byApartment.get(e.apartment.id) ?? []), e]);
  }
  const groups = [...byApartment.values()].sort((a, b) =>
    a[0].apartment.name.localeCompare(b[0].apartment.name, 'uk'),
  );

  for (const group of groups) {
    lines.push('', `🏠 ${group[0].apartment.name}`);
    for (const entry of group.sort(compareEntries)) {
      const { reading, meter } = entry;
      const missing = missingZones(meter, reading);
      // The API refuses a value lower than the previous one: no confirm button for it.
      const canConfirm = missing.length === 0 && !hasLowerValue(reading);
      lines.push(readingTitle(meter, reading));
      lines.push(...zoneLines(entry, missing));
      if (reading.status !== 'DRAFT') continue;
      if (reading.note) lines.push(...reading.note.split('\n').map((l) => `  📝 ${l}`));
      const short = shortName(meter);
      const row: SummaryButton[] = [];
      if (canConfirm) {
        confirmable.push(reading.id);
        row.push({
          text: `Підтвердити: ${short}`,
          action: { kind: 'confirm', readingId: reading.id },
        });
      }
      row.push({ text: `Скасувати: ${short}`, action: { kind: 'cancel', readingId: reading.id } });
      buttons.push(row);
    }
  }

  if (confirmable.length >= 2) {
    buttons.push([
      { text: 'Підтвердити всі', action: { kind: 'confirm-all', readingIds: confirmable } },
    ]);
  }
  if (buttons.length === 0) lines.push('', 'Усе опрацьовано.');
  return { text: lines.join('\n'), buttons };
}

function compareEntries(a: SummaryEntry, b: SummaryEntry): number {
  const order = (e: SummaryEntry) => (e.meter ? UTILITY_ORDER.indexOf(e.meter.utility) : 99);
  return order(a) - order(b) || a.reading.period.localeCompare(b.reading.period);
}

function meterZones(meter: Meter | null, reading: Reading): Zone[] {
  if (!meter) return reading.values.map((v) => v.zone);
  return meter.zoneScheme === 'DAY_NIGHT' ? ['DAY', 'NIGHT'] : ['TOTAL'];
}

function missingZones(meter: Meter | null, reading: Reading): Zone[] {
  return meterZones(meter, reading).filter((z) => !reading.values.some((v) => v.zone === z));
}

function readingTitle(meter: Meter | null, reading: Reading): string {
  const status =
    reading.status === 'CONFIRMED'
      ? ' — ✅ підтверджено'
      : reading.status === 'CANCELLED'
        ? ' — ❌ скасовано'
        : '';
  if (!meter) return `Лічильник, ${reading.period}${status}`;
  const label = meter.label ? ` (${meter.label})` : '';
  const serial = meter.serialNumber ? ` №${meter.serialNumber}` : '';
  return `${UTILITY_ICONS[meter.utility]} ${UTILITY_NAMES[meter.utility]}${label}${serial}, ${reading.period}${status}`;
}

// For a button: "⚡ кухня" / "💧 Холодна вода".
function shortName(meter: Meter | null): string {
  if (!meter) return 'лічильник';
  return `${UTILITY_ICONS[meter.utility]} ${meter.label ?? UTILITY_NAMES[meter.utility]}`;
}

function zoneLines({ apartment, meter, reading }: SummaryEntry, missing: Zone[]): string[] {
  const lines: string[] = [];
  for (const zone of meterZones(meter, reading)) {
    const name = ZONE_NAMES[zone];
    if (missing.includes(zone)) {
      if (reading.status === 'DRAFT') lines.push(`  ${name}: бракує — надішліть фото цієї зони`);
      continue;
    }
    const value = reading.values.find((v) => v.zone === zone)?.value ?? '0';
    const used = reading.consumption?.find((c) => c.zone === zone)?.value;
    if (used === undefined) {
      lines.push(
        `  ${name}: ${formatThousandths(toThousandths(value))} (попереднього показання немає)`,
      );
      continue;
    }
    const usedBig = toThousandths(used);
    const valueBig = toThousandths(value);
    const unit = meter ? ` ${UTILITY_UNITS[meter.utility]}` : '';
    const sign = usedBig < 0n ? '' : '+';
    lines.push(
      `  ${name}: ${formatThousandths(valueBig)} (було ${formatThousandths(valueBig - usedBig)}; ${sign}${formatThousandths(usedBig)}${unit})`,
    );
    if (reading.status !== 'DRAFT' || !meter) continue;
    if (usedBig < 0n) {
      lines.push('  ⚠️ Менше за попереднє — підтвердити не вийде');
      continue;
    }
    const months = monthsSincePrevious(meter, reading);
    for (const w of consumptionWarnings({
      utility: meter.utility,
      zone,
      consumption: used,
      months,
      hasLease: apartment.hasLease,
    })) {
      lines.push(`  ⚠️ ${warningText(meter.utility, zone, w, used, months)}`);
    }
  }
  return lines;
}

function hasLowerValue(reading: Reading): boolean {
  return (reading.consumption ?? []).some((c) => toThousandths(c.value) < 0n);
}

// Months since the previous CONFIRMED reading (the meter's last one, unless that is this reading); ≥ 1.
function monthsSincePrevious(meter: Meter, reading: Reading): number {
  const last = meter.lastReading;
  if (!last || last.id === reading.id) return 1;
  return Math.max(1, monthsBetween(last.period, reading.period));
}

// Same wording as the web (apps/web/lib/consumption.ts).
function warningText(
  utility: Utility,
  zone: Zone,
  warning: ConsumptionWarning,
  consumption: string,
  months: number,
): string {
  if (warning === 'ZERO_CONSUMPTION') return 'Нульове споживання, хоча є договір';
  const span = months > 1 ? ` за ${months} міс.` : '';
  return `Спожито ${formatThousandths(toThousandths(consumption))} ${UTILITY_UNITS[utility]}${span} — більше за звичні ${consumptionLimit(utility, zone)}/міс.`;
}
