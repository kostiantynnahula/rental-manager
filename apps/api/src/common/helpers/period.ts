// A reading period is a month: "YYYY-MM" in the API, its 1st day (@db.Date, UTC midnight) in the DB.

export function periodOfDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function formatPeriod(period: Date): string {
  return period.toISOString().slice(0, 7);
}

// "2026-10" → 2026-10-01 (input already validated by @IsPeriod()).
export function parsePeriod(value: string): Date {
  return new Date(`${value}-01T00:00:00.000Z`);
}

// 1st day of the month n months later (n may be negative).
export function addMonths(period: Date, n: number): Date {
  return new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + n, 1));
}

// Whole months from one period to another: 2026-09-01 → 2026-11-01 = 2.
export function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  );
}

// A lease (inclusive dates, endDate null = open-ended) overlaps the period's month.
export function leaseOverlapsPeriod(
  lease: { startDate: Date; endDate: Date | null },
  period: Date,
): boolean {
  return (
    lease.startDate <= periodEnd(period) && (lease.endDate === null || lease.endDate >= period)
  );
}

// Last day of the period's month.
export function periodEnd(period: Date): Date {
  return new Date(addMonths(period, 1).getTime() - 24 * 60 * 60 * 1000);
}
