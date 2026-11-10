import type { ExtractedReading } from '../interfaces/extracted-reading.interface.js';
import type { ExtractionCandidate } from '../interfaces/extraction-candidate.interface.js';
import type { Extraction } from '../interfaces/extraction.interface.js';

// Same shape the API accepts (>= 0, up to 3 decimals); "72.9" stays "72.9" (no padding).
const METER_VALUE = /^\d+(\.\d{1,3})?$/;
const ZONES_BY_SCHEME = { SINGLE: ['TOTAL'], DAY_NIGHT: ['DAY', 'NIGHT'] } as const;

// Our own checks on the model's answer: decimal comma → dot, leading zeros dropped (drums show "00532.20"),
// serial → digits only; a value that isn't a meter number, an unknown meter or a zone the matched meter doesn't
// have → an issue and low confidence. Nothing is dropped — a human reviews every reading.
export function normalizeExtraction(
  raw: Extraction,
  meters: ReadonlyArray<ExtractionCandidate>,
): Extraction {
  return {
    photoIssues: raw.photoIssues,
    readings: raw.readings.map((r) => normalizeReading(r, meters)),
  };
}

function normalizeReading(
  r: ExtractedReading,
  meters: ReadonlyArray<ExtractionCandidate>,
): ExtractedReading {
  const issues = [...r.issues];
  const value = r.value
    .trim()
    .replace(',', '.')
    .replace(/^0+(?=\d)/, '');
  if (!METER_VALUE.test(value)) issues.push('value is not a meter number');
  const digits = r.serialNumber?.replace(/\D/g, '') ?? '';
  const meter = meters.find((m) => m.id === r.meterId);
  if (r.meterId !== null && !meter) issues.push('unknown meterId');
  const zones: readonly string[] = meter ? ZONES_BY_SCHEME[meter.zoneScheme] : [];
  if (meter && !zones.includes(r.zone))
    issues.push(`zone ${r.zone} not on a ${meter.zoneScheme} meter`);
  const flagged = issues.length > r.issues.length;
  return {
    ...r,
    meterId: meter ? r.meterId : null,
    serialNumber: digits === '' ? null : digits,
    value,
    confidence: flagged ? 'low' : r.confidence,
    issues,
  };
}
