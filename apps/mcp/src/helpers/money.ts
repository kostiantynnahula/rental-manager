// The API sends amounts as integer kopiyky; tools show UAH strings ("15864.00"). Integer math only, never floats:
// this is formatting, not a recalculation. Prices ("4.3200") already come as UAH strings and pass through.
export function kopiykyToUah(kopiyky: number): string {
  if (!Number.isSafeInteger(kopiyky)) throw new Error(`Not an integer amount: ${kopiyky}`);
  const sign = kopiyky < 0 ? '-' : '';
  const abs = Math.abs(kopiyky);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export const UAH_AMOUNT = /^\d+(\.\d{1,2})?$/;

// "123.45" → 12345 (input amounts, e.g. a bill's manual amount). Validate with UAH_AMOUNT first.
export function uahToKopiyky(uah: string): number {
  if (!UAH_AMOUNT.test(uah)) throw new Error(`Not a UAH amount: ${uah}`);
  const [whole, fraction = ''] = uah.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
