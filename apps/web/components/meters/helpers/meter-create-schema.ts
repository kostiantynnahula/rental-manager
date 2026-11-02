import { z } from 'zod';
import { meterDateError } from './meter-date-error';
import { readingValuesSchema } from './reading-values-schema';

export const meterCreateSchema = z
  .object({
    utility: z.enum(['ELECTRICITY', 'COLD_WATER', 'HOT_WATER', 'GAS']),
    zoneScheme: z.enum(['SINGLE', 'DAY_NIGHT']),
    label: z.string().trim().max(100, 'Не більше 100 символів'),
    serialNumber: z.string().trim().max(100, 'Не більше 100 символів'),
    installedAt: z.string(),
    initialValues: readingValuesSchema(),
  })
  .superRefine((v, ctx) => {
    const error = meterDateError(v.installedAt);
    if (error) ctx.addIssue({ code: 'custom', path: ['installedAt'], message: error });
    // Water and gas meters are always single-zone (the UI hides the choice; this is the backstop).
    if (v.utility !== 'ELECTRICITY' && v.zoneScheme !== 'SINGLE')
      ctx.addIssue({ code: 'custom', path: ['zoneScheme'], message: 'Лише для електроенергії' });
  });

export type MeterCreateValues = z.infer<typeof meterCreateSchema>;
