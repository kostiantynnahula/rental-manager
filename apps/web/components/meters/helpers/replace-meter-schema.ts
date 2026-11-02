import { z } from 'zod';
import type { Meter } from '@/lib/api/queries/meters';
import { meterDateError } from './meter-date-error';
import { readingValuesSchema } from './reading-values-schema';

// Old meter: removal date + final values (not lower than its last). New meter: scheme, label, serial, initials.
export function replaceMeterSchema(old: Meter) {
  const last = old.lastReading;
  return z
    .object({
      date: z.string(),
      finalValues: readingValuesSchema(last?.values),
      zoneScheme: z.enum(['SINGLE', 'DAY_NIGHT']),
      label: z.string().trim().max(100, 'Не більше 100 символів'),
      serialNumber: z.string().trim().max(100, 'Не більше 100 символів'),
      initialValues: readingValuesSchema(),
    })
    .superRefine((v, ctx) => {
      const error = meterDateError(v.date, last?.readingDate);
      if (error) ctx.addIssue({ code: 'custom', path: ['date'], message: error });
      if (old.utility !== 'ELECTRICITY' && v.zoneScheme !== 'SINGLE')
        ctx.addIssue({ code: 'custom', path: ['zoneScheme'], message: 'Лише для електроенергії' });
    });
}

export type ReplaceMeterValues = z.infer<ReturnType<typeof replaceMeterSchema>>;
