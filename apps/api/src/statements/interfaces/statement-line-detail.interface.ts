import type { UtilityType } from '../../generated/prisma/enums.js';

// One meter's share of a metered line as saved in StatementLine.details (JSON, hence the decimal string).
export interface StatementLineDetail {
  meterId: string;
  utility: UtilityType;
  label: string | null;
  serialNumber: string | null;
  consumption: string;
}
