import { UTILITY_LABELS, type UtilityType } from '@/lib/utilities';
import { utilitySetOf } from './utility-set-of';

// "Холодна + гаряча вода"; "—" for a fixed fee.
export function tariffUtilitiesLabel(utilities: readonly UtilityType[]): string {
  if (utilities.length === 0) return '—';
  return utilitySetOf(utilities)?.label ?? utilities.map((u) => UTILITY_LABELS[u]).join(' + ');
}
