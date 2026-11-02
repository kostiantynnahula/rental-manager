// uk-UA display formatting. Money is integer kopiyky; dates/periods are calendar strings from the API
// ("YYYY-MM-DD", "YYYY-MM"), handled as strings so no timezone can shift them a day.

const NBSP = ' ';
// Money columns are Postgres integers (kopiyky): the API rejects more (PG_INT_MAX).
export const MAX_MONEY_KOPIYKY = 2_147_483_647;

const groupFormatter = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });

// 123456 → "1 234,56 грн" (non-breaking spaces, so the amount never wraps).
export function formatMoney(kopiyky: number): string {
  if (!Number.isSafeInteger(kopiyky)) throw new RangeError(`Not an integer amount: ${kopiyky}`);
  const abs = Math.abs(kopiyky);
  const kop = abs % 100;
  // Exact integer division: abs - kop is a multiple of 100.
  const hryvni = (abs - kop) / 100;
  const sign = kopiyky < 0 ? '-' : '';
  return `${sign}${groupFormatter.format(hryvni)},${String(kop).padStart(2, '0')}${NBSP}грн`;
}

// "1234,56" / "1234.56" / "1 234,5 грн" → 123456 / 123450; invalid or negative → null. Never goes through floats.
export function parseMoney(input: string): number | null {
  const compact = input.replace(/\s/g, '').replace(/грн\.?$/i, '');
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(compact);
  if (!match) return null;
  const kopiyky = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(kopiyky) ? kopiyky : null;
}

function isValidDay(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  // Day 0 of the next month = last day of this one.
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// "2026-10-28" → "28.10.2026"
export function formatDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new RangeError(`Not a YYYY-MM-DD date: ${isoDate}`);
  return `${match[3]}.${match[2]}.${match[1]}`;
}

// "28.10.2026" (also "8.1.2026") → "2026-10-28"; invalid → null.
export function parseDate(display: string): string | null {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(display.trim());
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (!isValidDay(year, month, day)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Nominative month names: Intl gives "жовтня"/"жовтень 2026 р.", not the plain "жовтень 2026" we want.
const MONTHS = [
  'січень',
  'лютий',
  'березень',
  'квітень',
  'травень',
  'червень',
  'липень',
  'серпень',
  'вересень',
  'жовтень',
  'листопад',
  'грудень',
] as const;

// "2026-10" → "жовтень 2026"
export function formatPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  const month = match ? Number(match[2]) : 0;
  if (!match || month < 1 || month > 12) throw new RangeError(`Not a YYYY-MM period: ${period}`);
  return `${MONTHS[month - 1]} ${match[1]}`;
}

// "жовтень 2026" (any case) → "2026-10"; invalid → null.
export function parsePeriod(display: string): string | null {
  const match = /^(\p{L}+)\s+(\d{4})$/u.exec(display.trim().toLowerCase());
  if (!match) return null;
  const index = MONTHS.indexOf(match[1] as (typeof MONTHS)[number]);
  if (index === -1) return null;
  return `${match[2]}-${String(index + 1).padStart(2, '0')}`;
}

// "+38 050 111-22-33" → "tel:+380501112233"
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

const kyivDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Kyiv',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Today in Kyiv as "YYYY-MM-DD" (en-CA formats as ISO) — the same "today" the API uses for current leases.
export function todayDateOnly(): string {
  return kyivDateFormatter.format(new Date());
}
