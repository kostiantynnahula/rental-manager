import type { ExtractedReading } from '../../extraction/interfaces/extracted-reading.interface.js';

// CreateDraftValueDto.note limit.
const MAX_NOTE = 1000;

// One line for the draft's note (Ukrainian — the review screen shows it): plausibility warnings, plus the model's
// confidence and issues when it wasn't sure. Nothing to say → undefined (no note).
export function draftNote(reading: ExtractedReading, warnings: string[]): string | undefined {
  const parts = [...warnings];
  if (reading.confidence !== 'high') {
    const issues = reading.issues.length > 0 ? `: ${reading.issues.join(', ')}` : '';
    parts.push(`впевненість ${reading.confidence}${issues}`);
  }
  if (parts.length === 0) return undefined;
  const note = `Фото ${reading.zone}: ${parts.join('; ')}`;
  return note.length > MAX_NOTE ? `${note.slice(0, MAX_NOTE - 1)}…` : note;
}
