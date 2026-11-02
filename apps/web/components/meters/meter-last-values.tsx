import type { Meter } from '@/lib/api/queries/meters';
import { formatDate } from '@/lib/format';
import { formatMeterValue } from '@/lib/meter-values';
import { UTILITY_UNITS, ZONE_LABELS } from '@/lib/utilities';

// The meter's last confirmed values with units and date, or "Немає показань".
export function MeterLastValues({ meter }: { meter: Meter }) {
  const last = meter.lastReading;
  if (!last) return <p className="text-sm text-muted-foreground">Немає показань</p>;
  const unit = UTILITY_UNITS[meter.utility];
  const many = last.values.length > 1;
  return (
    <div className="space-y-0.5">
      {last.values.map((v) => (
        <p key={v.zone} className="font-medium tabular-nums">
          {many && <span className="text-muted-foreground">{ZONE_LABELS[v.zone]}: </span>}
          {formatMeterValue(v.value)} <span className="text-sm text-muted-foreground">{unit}</span>
        </p>
      ))}
      <p className="text-xs text-muted-foreground">станом на {formatDate(last.readingDate)}</p>
    </div>
  );
}
