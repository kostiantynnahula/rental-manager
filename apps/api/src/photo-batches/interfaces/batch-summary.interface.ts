import type { Photo } from '../../generated/prisma/client.js';
import type { BatchSummaryApartment } from './batch-summary-apartment.interface.js';

// Everything the bot shows after a batch is parsed (helpers/batch-summary.ts).
export interface BatchSummary {
  batchId: string;
  photos: Pick<Photo, 'id' | 'parseStatus' | 'parseNote'>[];
  apartments: BatchSummaryApartment[];
}
