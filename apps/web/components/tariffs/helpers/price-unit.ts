import type { Tariff } from '@/lib/api/queries/tariffs';
import { UTILITY_UNITS } from '@/lib/utilities';

// "грн/кВт·год", "грн/м³" (all utilities of a tariff share a unit) or "грн/міс." for a fixed fee.
export function priceUnit(tariff: Pick<Tariff, 'kind' | 'utilities'>): string {
  const utility = tariff.utilities[0];
  return tariff.kind === 'METERED' && utility ? `грн/${UTILITY_UNITS[utility]}` : 'грн/міс.';
}
