import { meterTitle } from '@/components/meters/helpers/meter-title';
import type { ReadingHistoryItem } from '@/lib/api/queries/readings';
import { formatPeriod } from '@/lib/format';

// "Електроенергія · кухня, жовтень 2026" — names the photo for screen readers and the viewer title.
export function historyPhotoLabel(item: ReadingHistoryItem): string {
  return `${meterTitle(item.meter)}, ${formatPeriod(item.period)}`;
}
