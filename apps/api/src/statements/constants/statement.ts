import { UtilityType, Zone } from '../../generated/prisma/enums.js';

export const STATEMENT_WARNING_CODES = [
  'MISSING_READING',
  'NO_PRICE',
  'NO_METERS',
  'MULTIPLE_LEASES',
  'UNUSUAL_CONSUMPTION',
  'MISSING_MANUAL_AMOUNT',
] as const;
export type StatementWarningCode = (typeof STATEMENT_WARNING_CODES)[number];

// Shown as is, like a tariff name.
export const RENT_LINE_NAME = 'Оренда';

// Display order of metered lines.
export const STATEMENT_UTILITY_ORDER: readonly UtilityType[] = [
  UtilityType.ELECTRICITY,
  UtilityType.COLD_WATER,
  UtilityType.HOT_WATER,
  UtilityType.GAS,
];
export const STATEMENT_ZONE_ORDER: readonly Zone[] = [Zone.DAY, Zone.NIGHT, Zone.TOTAL];
