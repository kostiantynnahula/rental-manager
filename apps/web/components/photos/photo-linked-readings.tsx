import { meterTitle } from '@/components/meters/helpers/meter-title';
import { Badge } from '@/components/ui/badge';
import type { Meter } from '@/lib/api/queries/meters';
import type { PhotoReading } from '@/lib/api/queries/photos';
import { formatPeriod } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ZONE_LABELS } from '@/lib/utilities';
import { PHOTO_READING_STATUS_LABELS } from './constants/reading-statuses';

// What has already been taken from this photo (incl. cancelled readings, which no longer count). A two-zone
// reading names the zones read from this photo (the other one may come from another photo).
export function PhotoLinkedReadings({
  readings,
  meters,
}: {
  readings: PhotoReading[];
  meters: Meter[];
}) {
  if (readings.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">З цього фото</h2>
      <ul className="divide-y rounded-lg border">
        {readings.map((r) => {
          const meter = meters.find((m) => m.id === r.meterId);
          const cancelled = r.status === 'CANCELLED';
          return (
            <li
              key={r.id}
              className={cn(
                'flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm',
                cancelled && 'text-muted-foreground',
              )}
            >
              <span>
                {meter ? meterTitle(meter) : 'Лічильник'} · {formatPeriod(r.period)}
                {meter?.zoneScheme === 'DAY_NIGHT' &&
                  ` · ${r.zones.map((z) => ZONE_LABELS[z]).join(', ')}`}
              </span>
              <Badge variant={r.status === 'CONFIRMED' ? 'default' : 'outline'}>
                {PHOTO_READING_STATUS_LABELS[r.status]}
              </Badge>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
