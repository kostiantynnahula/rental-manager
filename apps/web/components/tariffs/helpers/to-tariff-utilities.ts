import type { TariffKind } from '@/lib/api/queries/tariffs';
import type { UtilityType } from '@/lib/utilities';
import { UTILITY_SETS } from '../constants/utility-sets';

// Form choice → API utilities; a fixed fee and a manual amount have none.
export function toTariffUtilities(kind: TariffKind, utilitySet: string): UtilityType[] {
  if (kind !== 'METERED') return [];
  return [...(UTILITY_SETS.find((s) => s.value === utilitySet)?.utilities ?? [])];
}
