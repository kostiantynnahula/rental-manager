import type { UtilityType } from '@/lib/utilities';

export interface UtilitySet {
  value: string;
  label: string;
  utilities: readonly UtilityType[];
}

// What a METERED tariff can bill, as one choice. The API rule (one unit per tariff: electricity or gas alone,
// water utilities combine — e.g. drainage) holds by construction.
export const UTILITY_SETS = [
  { value: 'ELECTRICITY', label: 'Електроенергія', utilities: ['ELECTRICITY'] },
  { value: 'COLD_WATER', label: 'Холодна вода', utilities: ['COLD_WATER'] },
  { value: 'HOT_WATER', label: 'Гаряча вода', utilities: ['HOT_WATER'] },
  {
    value: 'WATER',
    label: 'Холодна + гаряча вода',
    utilities: ['COLD_WATER', 'HOT_WATER'],
  },
  { value: 'GAS', label: 'Газ', utilities: ['GAS'] },
] as const satisfies readonly UtilitySet[];

export type UtilitySetValue = (typeof UTILITY_SETS)[number]['value'];
