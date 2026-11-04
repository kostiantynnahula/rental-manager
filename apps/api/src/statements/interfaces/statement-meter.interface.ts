import type { UtilityType } from '../../generated/prisma/enums.js';

export interface StatementMeter {
  id: string;
  utility: UtilityType;
  label: string | null;
  serialNumber: string | null;
  installedAt: Date;
  removedAt: Date | null;
}
