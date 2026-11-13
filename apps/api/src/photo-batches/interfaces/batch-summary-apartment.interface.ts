import type { Apartment } from '../../generated/prisma/client.js';
import type { BatchSummaryReading } from './batch-summary-reading.interface.js';

// The readings of one apartment (the meter's apartment) taken from the batch's photos.
export interface BatchSummaryApartment {
  apartment: Apartment;
  readings: BatchSummaryReading[];
}
