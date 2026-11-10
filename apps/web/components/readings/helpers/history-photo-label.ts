import { meterTitle } from '@/components/meters/helpers/meter-title';
import type { ReadingHistoryItem } from '@/lib/api/queries/readings';
import { formatPeriod } from '@/lib/format';
import { ZONE_LABELS, type Zone } from '@/lib/utilities';

// "Електроенергія · кухня, жовтень 2026 (День)" — names the photo for screen readers and the viewer title.
// The zones are added only when the photo backs part of a multi-zone reading.
export function historyPhotoLabel(item: ReadingHistoryItem, zones: ReadonlyArray<Zone>): string {
  const base = `${meterTitle(item.meter)}, ${formatPeriod(item.period)}`;
  return zones.length < item.values.length
    ? `${base} (${zones.map((z) => ZONE_LABELS[z]).join(', ')})`
    : base;
}
