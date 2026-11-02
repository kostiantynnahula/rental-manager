import { z } from 'zod';
import type { Meter } from '@/lib/api/queries/meters';
import { meterDateError } from './meter-date-error';
import { readingValuesSchema } from './reading-values-schema';

// Removal date (not in the future, not before the last reading) + final values (not lower than the last ones).
export function removeMeterSchema(last: Meter['lastReading']) {
  return z
    .object({ removedAt: z.string(), finalValues: readingValuesSchema(last?.values) })
    .superRefine((v, ctx) => {
      const error = meterDateError(v.removedAt, last?.readingDate);
      if (error) ctx.addIssue({ code: 'custom', path: ['removedAt'], message: error });
    });
}

export type RemoveMeterValues = z.infer<ReturnType<typeof removeMeterSchema>>;
