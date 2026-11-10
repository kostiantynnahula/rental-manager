import type { ConsumptionWarning } from '@rental/shared';
import type { UtilityType, Zone } from '../../generated/prisma/enums.js';
import type { StatementWarningCode } from '../constants/statement.js';

// MISSING_READING: meterId, utility, label. NO_PRICE: tariffId, tariffName, zone. NO_METERS: tariffId, tariffName.
// UNUSUAL_CONSUMPTION: meterId, utility, label, zone, consumption, limit, months, reason.
export interface StatementWarning {
  code: StatementWarningCode;
  meterId?: string;
  utility?: UtilityType;
  label?: string | null;
  tariffId?: string;
  tariffName?: string;
  zone?: Zone;
  // Decimal string, e.g. "340.5".
  consumption?: string;
  // Usual consumption per month for the utility + zone.
  limit?: number;
  // Months since the previous reading (≥ 1).
  months?: number;
  reason?: ConsumptionWarning;
}
