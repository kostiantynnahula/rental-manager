import type { Meter, Reading } from '../../generated/prisma/client.js';
import type { Zone } from '../../generated/prisma/enums.js';
import type { BatchSummaryValue } from './batch-summary-value.interface.js';

export interface BatchSummaryReading {
  reading: Reading;
  meter: Meter;
  // DRAFT, no zone missing, none lower than the previous value. The other confirm rules are checked on confirm.
  canConfirm: boolean;
  // Zones of the meter the reading doesn't have yet (a DRAFT filled zone by zone).
  missingZones: Zone[];
  // In the meter's zone order.
  values: BatchSummaryValue[];
}
