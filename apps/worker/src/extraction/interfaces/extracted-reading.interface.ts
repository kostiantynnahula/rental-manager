import type { components } from '../../api/schema.js';

type Schemas = components['schemas'];

// One register read from the photo — a proposal only; a human confirms every value before it is used.
export interface ExtractedReading {
  // One of the candidates' ids, or null when no candidate matched (or the model wasn't sure).
  meterId: string | null;
  // Digits only, as printed (no leading year); null if not visible.
  serialNumber: string | null;
  utility: Schemas['UtilityType'];
  zone: Schemas['Zone'];
  // As shown on the meter, "." as decimal separator ("72.9"); not padded to 3 decimals.
  value: string;
  confidence: 'high' | 'medium' | 'low';
  // Short notes from the model plus our own checks (normalizeExtraction).
  issues: string[];
}
