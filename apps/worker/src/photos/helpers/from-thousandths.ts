// 532200n → "532.2" (no trailing zeros).
export function fromThousandths(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const abs = value < 0n ? -value : value;
  const frac = (abs % 1000n).toString().padStart(3, '0').replace(/0+$/, '');
  return `${sign}${abs / 1000n}${frac ? `.${frac}` : ''}`;
}
