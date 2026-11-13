import type { Lease, Photo } from '../../generated/prisma/client.js';
import type { ReadingConsumptionRow } from '../../readings/interfaces/reading-consumption-row.interface.js';
import type { BatchReading } from '../helpers/batch-reading-include.js';

// Everything buildBatchSummary needs, loaded by PhotoBatchesService.
export interface BatchSummaryInput {
  batchId: string;
  photos: Pick<Photo, 'id' | 'parseStatus' | 'parseNote'>[];
  readings: BatchReading[];
  // ReadingsService.consumptionRows of the readings.
  rows: ReadingConsumptionRow[];
  // All leases of the readings' apartments (zero electricity is suspicious only while one covers the period).
  leases: Pick<Lease, 'apartmentId' | 'startDate' | 'endDate'>[];
}
