import type { ApartmentMeterReading } from '@/lib/api/queries/readings';

// Meter to preselect: the first one still MISSING for the month, else the first with a draft; '' = none left.
// `skip` = meters saved in this session (their status may not be refetched yet).
export function pickMeter(rows: ApartmentMeterReading[], skip: ReadonlySet<string>): string {
  const open = rows.filter((r) => !skip.has(r.meter.id));
  return (
    open.find((r) => r.status === 'MISSING')?.meter.id ??
    open.find((r) => r.status === 'DRAFT')?.meter.id ??
    ''
  );
}
