// Months as "YYYY-MM" strings (like the API's `period`), handled as strings so no timezone can shift them.

// Readings for a month are usually sent in the first days of the next one: until this day of the month the
// form defaults to the previous month.
export const READINGS_DEADLINE_DAY = 10;

const PERIOD = /^(\d{4})-(\d{2})$/;

export function isPeriod(value: string): boolean {
  const match = PERIOD.exec(value);
  return match !== null && Number(match[2]) >= 1 && Number(match[2]) <= 12;
}

// "2026-01" + -1 → "2025-12"
export function addMonths(period: string, n: number): string {
  const match = PERIOD.exec(period);
  if (!match) throw new RangeError(`Not a YYYY-MM period: ${period}`);
  const index = Number(match[1]) * 12 + (Number(match[2]) - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

// today = "YYYY-MM-DD" (todayDateOnly(), Kyiv). Day ≤ 10 → previous month, otherwise the current one.
export function defaultReadingPeriod(today: string): string {
  const current = today.slice(0, 7);
  return Number(today.slice(8, 10)) <= READINGS_DEADLINE_DAY ? addMonths(current, -1) : current;
}

// Whole months between two periods: "2026-09" → "2026-11" = 2.
export function monthsBetween(from: string, to: string): number {
  const index = (p: string) => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7));
  return index(to) - index(from);
}

// A lease (inclusive "YYYY-MM-DD" dates, endDate null = open-ended) overlaps the period's month. Date strings of one
// format compare correctly as text.
export function leaseCoversPeriod(
  lease: { startDate: string; endDate: string | null },
  period: string,
): boolean {
  return (
    lease.startDate <= periodLastDay(period) &&
    (lease.endDate === null || lease.endDate >= `${period}-01`)
  );
}

export function periodLastDay(period: string): string {
  const [year, month] = period.split('-').map(Number);
  // Day 0 of the next month = last day of this one.
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${period}-${String(day).padStart(2, '0')}`;
}

// Same window the API enforces for readingDate: from the 1st of the period to the end of the next month.
export function readingDateWindow(period: string): { from: string; to: string } {
  return { from: `${period}-01`, to: periodLastDay(addMonths(period, 1)) };
}
