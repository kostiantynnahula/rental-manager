import { z } from 'zod';
import type { Extraction } from '../interfaces/extraction.interface.js';

// Structured output for the model (sent as native JSON schema, see PhotoExtractorService). The Anthropic SDK turns
// `enum` into a description hint, so the API doesn't enforce it: `meterId` is a plain string listing the allowed
// ids, and normalizeExtraction() replaces anything else with null + an issue (one bad id must not fail the photo).
// Values stay strings: normalizeExtraction() checks them too.
export function extractionSchema(meterIds: string[]): z.ZodType<Extraction> {
  const allowed =
    meterIds.length > 0 ? `one of: ${meterIds.join(', ')}` : 'always null (no meters on record)';
  return z.object({
    readings: z
      .array(
        z.object({
          meterId: z
            .string()
            .nullable()
            .describe(
              `Id of the candidate meter this register belongs to (${allowed}); null if none matches or you are unsure`,
            ),
          serialNumber: z
            .string()
            .nullable()
            .describe(
              'Serial number as printed, digits only, without a leading year; null if not visible',
            ),
          utility: z.enum(['ELECTRICITY', 'COLD_WATER', 'HOT_WATER', 'GAS']),
          zone: z.enum(['TOTAL', 'DAY', 'NIGHT']),
          value: z
            .string()
            .describe('Exactly as shown on the meter, "." as the decimal separator, e.g. "72.9"'),
          confidence: z.enum(['high', 'medium', 'low']),
          issues: z
            .array(z.string())
            .describe('Short notes, e.g. "glare", "blurred last digit", "serial cut off"'),
        }),
      )
      .describe('One entry per register read from the photo'),
    photoIssues: z
      .array(z.string())
      .describe('Why nothing (or not everything) on the photo could be read; empty if all is fine'),
  });
}
