// 1500050 kopiyky → "15000,50" (form input; no grouping so it round-trips through parseMoney).
export function rentToInput(kopiyky: number): string {
  const kop = kopiyky % 100;
  return `${(kopiyky - kop) / 100}${kop ? `,${String(kop).padStart(2, '0')}` : ''}`;
}
