// "532.2" → 532200n: compare and subtract meter values exactly (never as floats). Expects a valid meter value.
export function toThousandths(value: string): bigint {
  const [whole, frac = ''] = value.split('.');
  return BigInt(whole) * 1000n + BigInt(frac.padEnd(3, '0').slice(0, 3));
}
