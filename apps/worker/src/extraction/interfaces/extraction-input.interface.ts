import type { ExtractionCandidate } from './extraction-candidate.interface.js';

export interface ExtractionInput {
  // The original photo bytes (never logged).
  image: Buffer;
  meters: ExtractionCandidate[];
}
