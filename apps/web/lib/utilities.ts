// Utility / zone labels and units: the single source for every screen (meters, readings, statements).
import type { components } from '@/lib/api/schema';

export type UtilityType = components['schemas']['UtilityType'];
export type ZoneScheme = components['schemas']['ZoneScheme'];
export type Zone = components['schemas']['Zone'];

// Display order (also the order of groups on the meters tab).
export const UTILITY_ORDER: readonly UtilityType[] = [
  'ELECTRICITY',
  'COLD_WATER',
  'HOT_WATER',
  'GAS',
];

export const UTILITY_LABELS: Record<UtilityType, string> = {
  ELECTRICITY: 'Електроенергія',
  COLD_WATER: 'Холодна вода',
  HOT_WATER: 'Гаряча вода',
  GAS: 'Газ',
};

export const UTILITY_UNITS: Record<UtilityType, string> = {
  ELECTRICITY: 'кВт·год',
  COLD_WATER: 'м³',
  HOT_WATER: 'м³',
  GAS: 'м³',
};

export const ZONE_SCHEME_LABELS: Record<ZoneScheme, string> = {
  SINGLE: 'Одна зона',
  DAY_NIGHT: 'День/ніч',
};

export const ZONE_LABELS: Record<Zone, string> = {
  TOTAL: 'Загальна',
  DAY: 'День',
  NIGHT: 'Ніч',
};

// Same as the API's expectedZones(): the zones a reading of this meter must have, in display order.
export function zonesFor(scheme: ZoneScheme): Zone[] {
  return scheme === 'DAY_NIGHT' ? ['DAY', 'NIGHT'] : ['TOTAL'];
}

// Two-zone metering exists only for electricity; water and gas meters are always single.
export function zoneSchemesFor(utility: UtilityType): ZoneScheme[] {
  return utility === 'ELECTRICITY' ? ['SINGLE', 'DAY_NIGHT'] : ['SINGLE'];
}
