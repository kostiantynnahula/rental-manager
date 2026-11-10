import type { ExtractedReading } from './extracted-reading.interface.js';

// Result of one photo: every register read from it, plus why something couldn't be read.
export interface Extraction {
  readings: ExtractedReading[];
  photoIssues: string[];
}
