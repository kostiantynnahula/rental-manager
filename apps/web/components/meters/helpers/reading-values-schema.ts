import { z } from 'zod';
import type { Zone } from '@/lib/utilities';
import { compareMeterValues, formatMeterValue, normalizeMeterValue } from '@/lib/meter-values';

export interface ReadingValueField {
  zone: Zone;
  // As typed ("1520,35"); normalizeMeterValue() turns it into the API's "1520.350" on submit.
  value: string;
}

// One entry per zone of the meter. With `previous` (the last confirmed values), a lower value is an error —
// the same rule the API enforces ("readings only grow").
export function readingValuesSchema(previous?: ReadonlyArray<{ zone: Zone; value: string }>) {
  return z
    .array(z.object({ zone: z.enum(['TOTAL', 'DAY', 'NIGHT']), value: z.string() }))
    .superRefine((values, ctx) => {
      values.forEach((v, index) => {
        const path = [index, 'value'];
        if (v.value.trim() === '')
          return ctx.addIssue({ code: 'custom', path, message: 'Вкажіть показання' });
        const normalized = normalizeMeterValue(v.value);
        if (normalized === null)
          return ctx.addIssue({ code: 'custom', path, message: 'Число, до 3 знаків після коми' });
        const before = previous?.find((p) => p.zone === v.zone);
        if (before && compareMeterValues(normalized, before.value) < 0)
          ctx.addIssue({
            code: 'custom',
            path,
            message: `Менше за попереднє (${formatMeterValue(before.value)})`,
          });
      });
    });
}

// Form values → API body (call only after validation).
export function toReadingValuesInput(values: ReadingValueField[]) {
  return values.map((v) => ({ zone: v.zone, value: normalizeMeterValue(v.value) ?? v.value }));
}
