import { MAX_MONEY_KOPIYKY, parseMoney } from '@/lib/format';

// "123,45" → 12345 kopiyky; empty, invalid or over the API's limit → null (not sent).
export function parseManualAmount(input: string): number | null {
  const kopiyky = parseMoney(input);
  return kopiyky !== null && kopiyky <= MAX_MONEY_KOPIYKY ? kopiyky : null;
}
