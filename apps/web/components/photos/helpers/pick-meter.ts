import type { ApartmentMeterReading } from '@/lib/api/queries/readings';

// Meter to preselect: first one whose month's draft already holds a value from this photo (the worker's proposal to
// review), then the first one still MISSING, else the first with a draft; '' = none left.
// `skip` = meters saved in this session (their status may not be refetched yet).
export function pickMeter(
  rows: ApartmentMeterReading[],
  skip: Pick<ReadonlySet<string>, 'has'>,
  photoId: string,
): string {
  const open = rows.filter((r) => !skip.has(r.meter.id));
  return (
    open.find((r) => r.status === 'DRAFT' && r.reading?.values.some((v) => v.photoId === photoId))
      ?.meter.id ??
    open.find((r) => r.status === 'MISSING')?.meter.id ??
    open.find((r) => r.status === 'DRAFT')?.meter.id ??
    ''
  );
}
