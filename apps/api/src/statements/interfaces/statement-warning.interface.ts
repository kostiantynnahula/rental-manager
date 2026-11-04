import type { UtilityType, Zone } from '../../generated/prisma/enums.js';
import type { StatementWarningCode } from '../constants/statement.js';

// MISSING_READING: meterId, utility, label. NO_PRICE: tariffId, tariffName, zone. NO_METERS: tariffId, tariffName.
export interface StatementWarning {
  code: StatementWarningCode;
  meterId?: string;
  utility?: UtilityType;
  label?: string | null;
  tariffId?: string;
  tariffName?: string;
  zone?: Zone;
}
