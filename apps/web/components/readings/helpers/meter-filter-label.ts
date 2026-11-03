import { meterTitle } from '@/components/meters/helpers/meter-title';
import type { Meter } from '@/lib/api/queries/meters';

// "Газ · знятий" — removed meters stay selectable in the history filter.
export function meterFilterLabel(meter: Meter): string {
  return meter.removedAt ? `${meterTitle(meter)} · знятий` : meterTitle(meter);
}
