import { PhotoLinkButton } from '@/components/photos/photo-link-button';
import type { ReadingValue } from '@/lib/api/queries/readings';
import { formatMeterValue } from '@/lib/meter-values';
import { UTILITY_UNITS, ZONE_LABELS, type UtilityType } from '@/lib/utilities';

interface DraftValuesProps {
  values: ReadingValue[];
  utility: UtilityType;
  // Names the photos for screen readers ("Електроенергія, жовтень 2026").
  label: string;
}

// The values a draft already holds (read-only), each with 📷 if it was read from a photo.
export function DraftValues({ values, utility, label }: DraftValuesProps) {
  if (values.length === 0) return null;
  const unit = UTILITY_UNITS[utility];
  return (
    <ul className="space-y-1 rounded-lg border border-dashed px-3 py-2 text-sm">
      {values.map((v) => (
        <li key={v.zone} className="flex min-h-11 items-center justify-between gap-2 md:min-h-8">
          <span>
            <span className="text-muted-foreground">У чернетці · {ZONE_LABELS[v.zone]}:</span>{' '}
            <span className="tabular-nums">
              {formatMeterValue(v.value)} {unit}
            </span>
          </span>
          {v.photoId && (
            <PhotoLinkButton photoId={v.photoId} label={`${label} (${ZONE_LABELS[v.zone]})`} />
          )}
        </li>
      ))}
    </ul>
  );
}
