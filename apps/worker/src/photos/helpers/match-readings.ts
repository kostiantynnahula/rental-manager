import type { components } from '../../api/schema.js';
import type { ExtractedReading } from '../../extraction/interfaces/extracted-reading.interface.js';
import type { ReadingMatch } from '../interfaces/reading-match.interface.js';
import { serialDigitsMatch } from './serial-digits-match.js';

type Meter = components['schemas']['MeterResponseDto'];

// Fewer digits isn't a serial (e.g. a red sticker "27") → matched by utility instead.
const MIN_SERIAL_DIGITS = 4;
const ZONES_BY_SCHEME = { SINGLE: ['TOTAL'], DAY_NIGHT: ['DAY', 'NIGHT'] } as const;
const METER_VALUE = /^\d+(\.\d{1,3})?$/;

// Which installed meter each extracted reading belongs to. Worst case must be "not recognized", never "wrong
// meter": a recognized serial decides alone (no fallback when it matches nothing — it's another meter); without one,
// utility + zone must point to exactly one meter. The model's own meterId decides nothing.
// serialOnly (inbox photo: candidates from all apartments): no utility fallback — a guess could pick another
// apartment's meter.
export function matchReadings(
  readings: ReadonlyArray<ExtractedReading>,
  meters: ReadonlyArray<Meter>,
  { serialOnly }: { serialOnly: boolean },
): ReadingMatch[] {
  const matches = readings.map((reading) => matchOne(reading, meters, serialOnly));
  // Two readings of one photo for the same meter + zone: we can't tell which is right → neither.
  const key = (m: ReadingMatch) => (m.meter ? `${m.meter.id}:${m.reading.zone}` : null);
  return matches.map((m) => {
    const k = key(m);
    if (k && matches.filter((other) => key(other) === k).length > 1) {
      return { reading: m.reading, skip: `${m.reading.zone} read twice for one meter` };
    }
    return m;
  });
}

function matchOne(
  reading: ExtractedReading,
  meters: ReadonlyArray<Meter>,
  serialOnly: boolean,
): ReadingMatch {
  if (!METER_VALUE.test(reading.value)) {
    return { reading, skip: `value "${reading.value}" is not a meter number` };
  }
  const meterOrSkip = findMeter(reading, meters, serialOnly);
  if (typeof meterOrSkip === 'string') return { reading, skip: meterOrSkip };
  const zones: readonly string[] = ZONES_BY_SCHEME[meterOrSkip.zoneScheme];
  if (!zones.includes(reading.zone)) {
    return { reading, skip: `zone ${reading.zone} not on a ${meterOrSkip.zoneScheme} meter` };
  }
  return { reading, meter: meterOrSkip };
}

function findMeter(
  reading: ExtractedReading,
  meters: ReadonlyArray<Meter>,
  serialOnly: boolean,
): Meter | string {
  const serial = reading.serialNumber ?? '';
  if (serial.length >= MIN_SERIAL_DIGITS) {
    const found = meters.filter((m) => {
      const stored = (m.serialNumber ?? '').replace(/\D/g, '');
      return stored !== '' && serialDigitsMatch(serial, stored);
    });
    if (found.length === 1) return found[0];
    return found.length === 0
      ? `serial ${serial} matches no meter`
      : `serial ${serial} matches ${found.length} meters`;
  }
  if (serialOnly) return 'no serial (inbox photo: matched by serial only)';
  const found = meters.filter(
    (m) =>
      m.utility === reading.utility &&
      (ZONES_BY_SCHEME[m.zoneScheme] as readonly string[]).includes(reading.zone),
  );
  if (found.length === 1) return found[0];
  return `${found.length} ${reading.utility} meters with ${reading.zone}, no serial`;
}
