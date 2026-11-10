import type { ExtractionCandidate } from '../interfaces/extraction-candidate.interface.js';

// The user-message text listing the apartment's meters, one line each:
// "- id=…, utility=ELECTRICITY, zones=DAY_NIGHT, serial=05668317, label=kitchen".
export function describeCandidates(meters: ReadonlyArray<ExtractionCandidate>): string {
  if (meters.length === 0) return 'This apartment has no meters on record: set meterId to null.';
  const lines = meters.map(
    (m) =>
      `- id=${m.id}, utility=${m.utility}, zones=${m.zoneScheme}, ` +
      `serial=${m.serialNumber ?? 'none'}, label=${m.label ?? 'none'}`,
  );
  return `Candidate meters of this apartment:\n${lines.join('\n')}`;
}
