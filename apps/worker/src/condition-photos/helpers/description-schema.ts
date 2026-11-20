import { z } from 'zod';
import type { RawDescription } from '../interfaces/raw-description.interface.js';
import { ROOMS } from './rooms.js';

// Structured output for the model (native JSON schema, see ConditionPhotoDescriber). The SDK turns `enum` into a
// description hint (not enforced by the API), so normalizeDescription() checks the room again. Missing values are
// null, not optional: every field is always present in the answer.
export const descriptionSchema: z.ZodType<RawDescription> = z.object({
  room: z.enum(ROOMS).describe('The room on the photo; OTHER if unsure'),
  items: z
    .array(
      z.object({
        name: z.string().describe('What it is, in Ukrainian, e.g. "холодильник", "змішувач"'),
        count: z
          .number()
          .int()
          .nullable()
          .describe('How many are visible, only when more than one; otherwise null'),
        condition: z
          .string()
          .nullable()
          .describe(
            'Visible condition in Ukrainian: damage, wear, stains, missing parts; null if nothing notable',
          ),
      }),
    )
    .describe('Every visible item: furniture, appliances, fixtures, fittings, finishes'),
  summary: z
    .string()
    .describe('2–4 sentences in Ukrainian: the room, the main items and any visible damage'),
});
