import { ZONE_LABELS, type Zone } from '@/lib/utilities';

// "бракує: Ніч" — shown next to an incomplete draft.
export function missingZonesLabel(zones: ReadonlyArray<Zone>): string {
  return `бракує: ${zones.map((z) => ZONE_LABELS[z]).join(', ')}`;
}
