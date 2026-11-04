import type { StatementLine } from './statement-line.interface.js';
import type { StatementWarning } from './statement-warning.interface.js';

export interface StatementPreview {
  lines: StatementLine[];
  // Integer kopiyky: the sum of the line amounts.
  total: number;
  warnings: StatementWarning[];
  // The lease behind the rent line; absent without one.
  leaseId?: string;
}
