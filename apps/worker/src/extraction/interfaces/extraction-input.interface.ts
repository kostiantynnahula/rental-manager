import type { ExtractionCandidate } from './extraction-candidate.interface.js';

export interface ExtractionInput {
  // The original photo bytes (never logged).
  image: Buffer;
  meters: ExtractionCandidate[];
  // Inbox photo (no apartment yet): the candidates are the active meters of all apartments, matched by serial only.
  inbox: boolean;
}
