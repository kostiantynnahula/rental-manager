import { z } from 'zod';
import { readingValuesSchema } from '@/components/meters/helpers/reading-values-schema';
import type { Meter } from '@/lib/api/queries/meters';
import { formatDate, todayDateOnly } from '@/lib/format';
import { isPeriod, readingDateWindow } from '@/lib/period';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const entrySchema = z.object({
  meterId: z.string(),
  values: z.array(z.object({ zone: z.enum(['TOTAL', 'DAY', 'NIGHT']), value: z.string() })),
});

export type BatchReadingsValues = {
  period: string;
  readingDate: string;
  entries: z.infer<typeof entrySchema>[];
};

// A meter with every zone empty is skipped.
export function isEntryEmpty(entry: BatchReadingsValues['entries'][number]): boolean {
  return entry.values.every((v) => v.value.trim() === '');
}

// `meters` gives each entry its previous values (last confirmed); `savedIds` = meters already saved in this
// session (locked, not validated again).
export function batchReadingsSchema(meters: Meter[], savedIds: ReadonlySet<string>) {
  return z
    .object({ period: z.string(), readingDate: z.string(), entries: z.array(entrySchema) })
    .superRefine((v, ctx) => {
      if (!isPeriod(v.period))
        ctx.addIssue({ code: 'custom', path: ['period'], message: 'Вкажіть місяць' });
      else if (!DATE.test(v.readingDate))
        ctx.addIssue({ code: 'custom', path: ['readingDate'], message: 'Вкажіть дату' });
      else {
        // Same rules as the API: within the period's window and not in the future.
        const { from, to } = readingDateWindow(v.period);
        if (v.readingDate > todayDateOnly())
          ctx.addIssue({
            code: 'custom',
            path: ['readingDate'],
            message: 'Не може бути в майбутньому',
          });
        else if (v.readingDate < from || v.readingDate > to)
          ctx.addIssue({
            code: 'custom',
            path: ['readingDate'],
            message: `Дата має бути між ${formatDate(from)} і ${formatDate(to)}`,
          });
      }

      let filled = 0;
      v.entries.forEach((entry, i) => {
        if (savedIds.has(entry.meterId) || isEntryEmpty(entry)) return;
        filled += 1;
        const previous = meters.find((m) => m.id === entry.meterId)?.lastReading?.values;
        const result = readingValuesSchema(previous).safeParse(entry.values);
        for (const issue of result.error?.issues ?? [])
          ctx.addIssue({
            code: 'custom',
            path: ['entries', i, 'values', ...issue.path],
            message: issue.message,
          });
      });
      if (filled === 0 && v.entries.every((e) => !savedIds.has(e.meterId)))
        ctx.addIssue({
          code: 'custom',
          path: ['entries'],
          message: 'Внесіть показання хоча б одного лічильника',
        });
    });
}
