import type { ExtractedReading } from '../../extraction/interfaces/extracted-reading.interface.js';
import { truncate } from '../../helpers/truncate.js';

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
  return truncate(`Фото ${reading.zone}: ${parts.join('; ')}`, MAX_NOTE);
}
