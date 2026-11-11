import type { ManualAmounts } from '@/lib/api/queries/statements';
import type { ManualTariff } from '../interfaces/manual-tariff';
import { parseManualAmount } from './parse-manual-amount';

// What the preview and issue send: valid amounts only, and only for tariffs active in the month (an amount for
// anything else is a 400 — e.g. a tariff ended in another tab).
export function toManualAmounts(
  inputs: Record<string, string>,
  tariffs: ManualTariff[],
): ManualAmounts {
  const amounts: ManualAmounts = {};
  for (const { tariffId } of tariffs) {
    const kopiyky = parseManualAmount(inputs[tariffId] ?? '');
    if (kopiyky !== null) amounts[tariffId] = kopiyky;
  }
  return amounts;
}
