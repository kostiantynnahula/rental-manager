import type { components } from '../../api/schema.js';
import {
  aboveLimitText,
  BUTTON_TEXTS,
  decimalText,
  photoStatusText,
  RESULT_TEXTS,
  UTILITY_ICONS,
  UTILITY_NAMES,
  UTILITY_UNITS,
  ZONE_NAMES,
} from '../../messages.js';
import type { RenderedSummary } from '../interfaces/rendered-summary.interface.js';
import type { SummaryButton } from '../interfaces/summary-button.interface.js';
import { encodeAction } from './callback-data.js';

type Schemas = components['schemas'];
type Batch = Schemas['PhotoBatchResponseDto'];
type Reading = Schemas['PhotoBatchReadingResponseDto'];
type Value = Schemas['PhotoBatchValueResponseDto'];
type Meter = Schemas['PhotoBatchMeterResponseDto'];
type Apartment = Pick<Schemas['ApartmentDetailResponseDto'], 'id' | 'name'>;

// Telegram's message limit.
const MAX_TEXT = 4096;

// Pure: the API's batch summary → message text + buttons. The API computed everything (consumption, warnings,
// missing zones, canConfirm); this only words it. `apartments` = the active ones, for NOT_MATCHED photos.
export function renderSummary(batch: Batch, apartments: readonly Apartment[]): RenderedSummary {
  const lines: string[] = [RESULT_TEXTS.title];
  const buttons: SummaryButton[][] = [];
  let confirmable = 0;

  for (const apartment of batch.apartments) {
    lines.push('', `🏠 ${apartment.name}${apartment.isActive ? '' : RESULT_TEXTS.archived}`);
    for (const reading of apartment.readings) {
      lines.push(...readingLines(reading));
      if (reading.status !== 'DRAFT') continue;
      const meter = shortName(reading.meter);
      const row: SummaryButton[] = [];
      if (reading.canConfirm) {
        confirmable++;
        row.push({
          text: BUTTON_TEXTS.confirm(meter),
          data: encodeAction({ kind: 'confirm', batchId: batch.batchId, readingId: reading.id }),
        });
      }
      row.push({
        text: BUTTON_TEXTS.cancel(meter),
        data: encodeAction({ kind: 'cancel', batchId: batch.batchId, readingId: reading.id }),
      });
      buttons.push(row);
    }
  }

  // Photos the summary has no reading from: not matched (→ pick an apartment), failed, or parsing again.
  const withReadings = new Set(
    batch.apartments.flatMap((a) =>
      a.readings.flatMap((r) => r.values.flatMap((v) => (v.photoId ? [v.photoId] : []))),
    ),
  );
  const photoLines: string[] = [];
  batch.photos.forEach((photo, i) => {
    if (withReadings.has(photo.id)) return;
    const line = photoStatusText(i + 1, photo.parseStatus, photo.parseNote);
    if (!line) return;
    photoLines.push(line);
    if (photo.parseStatus !== 'NOT_MATCHED') return;
    for (const apartment of apartments) {
      buttons.push([
        {
          text: BUTTON_TEXTS.assign(i + 1, apartment.name),
          data: encodeAction({ kind: 'assign', photoId: photo.id, apartmentId: apartment.id }),
        },
      ]);
    }
  });
  if (photoLines.length > 0) lines.push('', ...photoLines);

  if (confirmable >= 2) {
    buttons.push([
      {
        text: RESULT_TEXTS.confirmAll,
        data: encodeAction({ kind: 'confirm-batch', batchId: batch.batchId }),
      },
    ]);
  }
  if (batch.apartments.length === 0 && photoLines.length === 0) {
    lines.push('', RESULT_TEXTS.nothingFound);
  } else if (buttons.length === 0) {
    lines.push('', RESULT_TEXTS.allDone);
  }
  return { text: truncate(lines.join('\n')), buttons };
}

function readingLines(reading: Reading): string[] {
  const { meter } = reading;
  const status =
    reading.status === 'CONFIRMED'
      ? RESULT_TEXTS.confirmed
      : reading.status === 'CANCELLED'
        ? RESULT_TEXTS.cancelled
        : '';
  const label = meter.label ? ` (${meter.label})` : '';
  const serial = meter.serialNumber ? ` №${meter.serialNumber}` : '';
  const lines = [
    `${UTILITY_ICONS[meter.utility]} ${UTILITY_NAMES[meter.utility]}${label}${serial}, ${reading.period}${status}`,
  ];
  for (const value of reading.values) lines.push(...valueLines(meter, reading, value));
  if (reading.status === 'DRAFT') {
    for (const zone of reading.missingZones) {
      lines.push(`  ${ZONE_NAMES[zone]}: ${RESULT_TEXTS.missingZone}`);
    }
    if (reading.note) lines.push(...reading.note.split('\n').map((l) => `  📝 ${l}`));
  }
  return lines;
}

function valueLines(meter: Meter, reading: Reading, v: Value): string[] {
  const name = ZONE_NAMES[v.zone];
  const value = decimalText(v.value);
  if (v.previousValue === null || v.consumption === null) {
    return [`  ${name}: ${value} (${RESULT_TEXTS.noPrevious})`];
  }
  const sign = v.consumption.startsWith('-') ? '' : '+';
  const lines = [
    `  ${name}: ${value} (було ${decimalText(v.previousValue)}; ${sign}${decimalText(v.consumption)} ${UTILITY_UNITS[meter.utility]})`,
  ];
  // Only a DRAFT needs the hints: a decided reading is history.
  if (reading.status !== 'DRAFT') return lines;
  if (v.lowerThanPrevious) return [...lines, `  ${RESULT_TEXTS.lower}`];
  for (const w of v.warnings) {
    const text =
      w.code === 'ZERO_CONSUMPTION'
        ? RESULT_TEXTS.zeroConsumption
        : aboveLimitText(meter.utility, v.consumption, w.months, w.limit);
    lines.push(`  ⚠️ ${text}`);
  }
  return lines;
}

// For a button: "⚡ кухня" / "💧 Холодна вода".
function shortName(meter: Meter): string {
  return `${UTILITY_ICONS[meter.utility]} ${meter.label ?? UTILITY_NAMES[meter.utility]}`;
}

function truncate(text: string): string {
  return text.length <= MAX_TEXT
    ? text
    : text.slice(0, MAX_TEXT - RESULT_TEXTS.truncated.length) + RESULT_TEXTS.truncated;
}
