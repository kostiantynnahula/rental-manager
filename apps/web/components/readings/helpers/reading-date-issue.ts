import { formatDate, todayDateOnly } from '@/lib/format';
import { isPeriod, readingDateWindow } from '@/lib/period';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Same rules as the API for period + readingDate: within the period's window and not in the future.
// null = valid. Used by every reading form's zod schema.
export function readingDateIssue(
  period: string,
  readingDate: string,
): { path: 'period' | 'readingDate'; message: string } | null {
  if (!isPeriod(period)) return { path: 'period', message: 'Вкажіть місяць' };
  if (!DATE.test(readingDate)) return { path: 'readingDate', message: 'Вкажіть дату' };
  if (readingDate > todayDateOnly())
    return { path: 'readingDate', message: 'Не може бути в майбутньому' };
  const { from, to } = readingDateWindow(period);
  if (readingDate < from || readingDate > to)
    return {
      path: 'readingDate',
      message: `Дата має бути між ${formatDate(from)} і ${formatDate(to)}`,
    };
  return null;
}
