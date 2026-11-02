import type { Meter } from '@/lib/api/queries/meters';
import { UTILITY_LABELS } from '@/lib/utilities';

// "Холодна вода · кухня" (label optional).
export function meterTitle(meter: Pick<Meter, 'utility' | 'label'>): string {
  return meter.label
    ? `${UTILITY_LABELS[meter.utility]} · ${meter.label}`
    : UTILITY_LABELS[meter.utility];
}
