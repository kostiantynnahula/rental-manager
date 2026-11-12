import type { components } from '../../api/schema.js';

type Utility = components['schemas']['UtilityType'];
type Zone = components['schemas']['Zone'];

// Ukrainian names, as in the web (apps/web/lib/utilities.ts). The bot can't import from the web.
export const UTILITY_NAMES: Record<Utility, string> = {
  ELECTRICITY: 'Електроенергія',
  COLD_WATER: 'Холодна вода',
  HOT_WATER: 'Гаряча вода',
  GAS: 'Газ',
};

export const UTILITY_ICONS: Record<Utility, string> = {
  ELECTRICITY: '⚡',
  COLD_WATER: '💧',
  HOT_WATER: '♨️',
  GAS: '🔥',
};

export const UTILITY_UNITS: Record<Utility, string> = {
  ELECTRICITY: 'кВт·год',
  COLD_WATER: 'м³',
  HOT_WATER: 'м³',
  GAS: 'м³',
};

// Display order of meters in a summary.
export const UTILITY_ORDER: Utility[] = ['ELECTRICITY', 'COLD_WATER', 'HOT_WATER', 'GAS'];

export const ZONE_NAMES: Record<Zone, string> = {
  TOTAL: 'Показник',
  DAY: 'День',
  NIGHT: 'Ніч',
};

// Thousandths → "1520,350": always 3 decimals, like the API's values (BigInt, never floats).
export function formatThousandths(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const abs = value < 0n ? -value : value;
  return `${sign}${abs / 1000n},${(abs % 1000n).toString().padStart(3, '0')}`;
}
