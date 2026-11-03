// Tariff prices are decimal strings end to end (UAH, like the API's Decimal(12,4)) — never JS numbers, so no
// float can round a price.

const INPUT = /^(\d{1,8})(?:[.,](\d{1,4}))?$/;

// "4,32" / "4.32" / " 055 " → "4.32" / "4.32" / "55"; invalid (sign, >4 decimals, >8 integer digits) → null.
export function normalizePrice(input: string): string | null {
  const match = INPUT.exec(input.trim());
  if (!match) return null;
  const integer = match[1].replace(/^0+(?=\d)/, '');
  return match[2] ? `${integer}.${match[2]}` : integer;
}

// "4.3200" → "4,32", "55.0000" → "55,00", "1.2345" → "1,2345" (uk decimal comma, at least kopiyky shown).
export function formatPrice(value: string): string {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return value;
  const fraction = (match[2] ?? '').replace(/0+$/, '').padEnd(2, '0');
  return `${match[1]},${fraction}`;
}
