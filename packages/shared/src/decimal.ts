// Meter values and consumption as exact decimals (up to 3 places), never JS floats.

// "532.2" → 532200n, "-1.5" → -1500n. Expects a decimal string ("12", "12.345", optional leading "-").
export function toThousandths(value: string): bigint {
  const negative = value.startsWith('-');
  const [whole, frac = ''] = (negative ? value.slice(1) : value).split('.');
  const abs = BigInt(whole) * 1000n + BigInt(frac.padEnd(3, '0').slice(0, 3));
  return negative ? -abs : abs;
}

// 532200n → "532.2" (no trailing zeros).
export function fromThousandths(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const abs = value < 0n ? -value : value;
  const frac = (abs % 1000n).toString().padStart(3, '0').replace(/0+$/, '');
  return `${sign}${abs / 1000n}${frac ? `.${frac}` : ''}`;
}
