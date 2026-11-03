import type { ReadingHistoryItem } from '@/lib/api/queries/readings';
import { formatMeterValueCompact } from '@/lib/meter-values';
import { UTILITY_UNITS, ZONE_LABELS } from '@/lib/utilities';

// "Д: 1520 / Н: 830 кВт·год" (day/night) or "152,3 м³" (single zone). Consumption: "—" when there is
// no previous confirmed reading (e.g. a meter's INITIAL reading).
export function formatHistoryValues(
  item: ReadingHistoryItem,
  field: 'value' | 'consumption',
): string {
  if (item.values.some((v) => v[field] === null)) return '—';
  const unit = UTILITY_UNITS[item.meter.utility];
  const single = item.values.length === 1;
  const parts = item.values.map((v) => {
    const value = formatMeterValueCompact(v[field] ?? '');
    return single ? value : `${ZONE_LABELS[v.zone].charAt(0)}: ${value}`;
  });
  return `${parts.join(' / ')} ${unit}`;
}
