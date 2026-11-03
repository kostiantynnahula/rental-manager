import type { UtilityType } from '@/lib/utilities';
import { UTILITY_SETS, type UtilitySet } from '../constants/utility-sets';

// The choice matching a tariff's utilities (any order); undefined for none (FIXED) or an unknown combination.
export function utilitySetOf(utilities: readonly UtilityType[]): UtilitySet | undefined {
  return UTILITY_SETS.find(
    (set) =>
      set.utilities.length === utilities.length &&
      set.utilities.every((u) => utilities.includes(u)),
  );
}
