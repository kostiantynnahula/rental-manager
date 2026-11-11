import type { Prisma } from '../../generated/prisma/client.js';
import type { StatementLineType, UtilityType, Zone } from '../../generated/prisma/enums.js';
import type { StatementLineMeter } from './statement-line-meter.interface.js';

export interface StatementLine {
  type: StatementLineType;
  tariffId?: string;
  name: string;
  zone?: Zone;
  utilities?: UtilityType[];
  // Absent only for MANUAL (amount only).
  quantity?: Prisma.Decimal;
  // UAH. Absent only for MANUAL.
  unitPrice?: Prisma.Decimal;
  // Integer kopiyky.
  amount: number;
  meters?: StatementLineMeter[];
}
