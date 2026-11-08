import { instantDateOnly, todayDateOnly } from '@/lib/format';
import { isPeriod, readingDateWindow } from '@/lib/period';

// Default "Дата зняття": the day the photo was uploaded (Kyiv), moved into the period's window and not past today.
export function photoReadingDate(uploadedAt: string, period: string): string {
  const uploaded = instantDateOnly(uploadedAt);
  if (!isPeriod(period)) return uploaded;
  const { from, to } = readingDateWindow(period);
  const today = todayDateOnly();
  const latest = to < today ? to : today;
  if (uploaded < from) return from;
  return uploaded > latest ? latest : uploaded;
}
