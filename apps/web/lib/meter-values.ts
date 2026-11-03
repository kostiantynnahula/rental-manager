// Meter values are decimal strings end to end ("1520.350", like the API's Decimal(12,3)) — never JS numbers,
// so no float can round a reading.

const INPUT = /^(\d{1,9})(?:[.,](\d{1,3}))?$/;

// "1520,35" / "1520.35" / " 1520 " → "1520.350"; invalid (sign, >3 decimals, >9 integer digits) → null.
export function normalizeMeterValue(input: string): string | null {
  const match = INPUT.exec(input.trim());
  if (!match) return null;
  const integer = match[1].replace(/^0+(?=\d)/, '');
  return `${integer}.${(match[2] ?? '').padEnd(3, '0')}`;
}

// Compares two values (any accepted input form); <0 / 0 / >0 like a sort comparator. Invalid input throws.
export function compareMeterValues(a: string, b: string): number {
  const [x, y] = [normalizeMeterValue(a), normalizeMeterValue(b)];
  if (x === null || y === null) throw new RangeError(`Not a meter value: ${x === null ? a : b}`);
  // Same fraction width, no leading zeros: a longer integer part is larger, otherwise compare as text.
  if (x.length !== y.length) return x.length - y.length;
  return x < y ? -1 : x > y ? 1 : 0;
}

// "1520.350" → "1520,350" (uk decimal comma; all 3 decimals kept — meters show them).
export function formatMeterValue(value: string): string {
  return (normalizeMeterValue(value) ?? value).replace('.', ',');
}

// Display in lists: "1520.000" → "1520", "12.350" → "12,35", "-3.500" → "-3,5" (consumption can be negative).
export function formatMeterValueCompact(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return value;
  const [, sign, integer, fraction = ''] = match;
  const trimmed = fraction.replace(/0+$/, '');
  return `${sign}${integer}${trimmed ? `,${trimmed}` : ''}`;
}
