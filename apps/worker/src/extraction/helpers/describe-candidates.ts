import type { ExtractionCandidate } from '../interfaces/extraction-candidate.interface.js';

// The user-message text listing the candidate meters, one line each:
// "- id=…, utility=ELECTRICITY, zones=DAY_NIGHT, serial=05668317, label=kitchen".
// Inbox photo: the apartment is unknown, so the header says to match by serial only.
export function describeCandidates(
  meters: ReadonlyArray<ExtractionCandidate>,
  inbox: boolean,
): string {
  if (meters.length === 0) return 'This apartment has no meters on record: set meterId to null.';
  const lines = meters.map(
    (m) =>
      `- id=${m.id}, utility=${m.utility}, zones=${m.zoneScheme}, ` +
      `serial=${m.serialNumber ?? 'none'}, label=${m.label ?? 'none'}`,
  );
  const header = inbox
    ? 'The apartment is unknown: these are the active meters of all apartments. ' +
      'Set meterId only when the serial number on the photo matches; otherwise null.'
    : 'Candidate meters of this apartment:';
  return `${header}\n${lines.join('\n')}`;
}
