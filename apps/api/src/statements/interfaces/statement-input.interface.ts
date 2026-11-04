import type { StatementAttachment } from './statement-attachment.interface.js';
import type { StatementConsumptionRow } from './statement-consumption-row.interface.js';
import type { StatementLease } from './statement-lease.interface.js';
import type { StatementMeter } from './statement-meter.interface.js';

// Everything the calculator needs, as plain data: all of the apartment's attachments, meters and leases (it
// decides what's active in the period) and the consumption rows of the period only.
export interface StatementInput {
  // 1st day of the month.
  period: Date;
  attachments: StatementAttachment[];
  meters: StatementMeter[];
  leases: StatementLease[];
  consumption: StatementConsumptionRow[];
}
