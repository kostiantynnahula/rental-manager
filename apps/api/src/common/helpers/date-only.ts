// API dates are "YYYY-MM-DD" strings; DB columns are @db.Date. Prisma maps a DATE to a Date at
// UTC midnight, so parsing/formatting in UTC keeps the calendar day unchanged.

// "Today" is the calendar day in Kyiv, not the server's (UTC) day.
const APP_TIME_ZONE = 'Europe/Kyiv';

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayDateOnly(): Date {
  // en-CA formats as YYYY-MM-DD.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE }).format(new Date());
  return parseDateOnly(today);
}
