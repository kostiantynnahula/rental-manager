import { z } from 'zod';
import { readingValuesSchema } from '@/components/meters/helpers/reading-values-schema';
import { readingDateIssue } from '@/components/readings/helpers/reading-date-issue';
import type { Meter } from '@/lib/api/queries/meters';

export type PhotoReadingValues = {
  period: string;
  readingDate: string;
  meterId: string;
  // Only the zones read from this photo (a draft may get the others from another photo).
  values: { zone: 'TOTAL' | 'DAY' | 'NIGHT'; value: string }[];
};

// One meter's values from a photo. `meters` gives the previous (last confirmed) values.
export function photoReadingSchema(meters: Meter[]) {
  return z
    .object({
      period: z.string(),
      readingDate: z.string(),
      meterId: z.string(),
      values: z.array(z.object({ zone: z.enum(['TOTAL', 'DAY', 'NIGHT']), value: z.string() })),
    })
    .superRefine((v, ctx) => {
      const dateIssue = readingDateIssue(v.period, v.readingDate);
      if (dateIssue)
        ctx.addIssue({ code: 'custom', path: [dateIssue.path], message: dateIssue.message });

      const meter = meters.find((m) => m.id === v.meterId);
      if (!meter) {
        ctx.addIssue({ code: 'custom', path: ['meterId'], message: 'Оберіть лічильник' });
        return;
      }
      if (v.values.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['values'], message: 'Оберіть зону з фото' });
        return;
      }
      const result = readingValuesSchema(meter.lastReading?.values).safeParse(v.values);
      for (const issue of result.error?.issues ?? [])
        ctx.addIssue({ code: 'custom', path: ['values', ...issue.path], message: issue.message });
    });
}
