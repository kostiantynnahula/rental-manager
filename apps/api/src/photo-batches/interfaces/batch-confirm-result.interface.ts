import type { BatchConfirmRefusal } from './batch-confirm-refusal.interface.js';

// What POST /photo-batches/:batchId/confirm did. Readings that weren't confirmable (partial, not a DRAFT, lower
// than previous) are in neither list.
export interface BatchConfirmResult {
  confirmed: string[];
  refused: BatchConfirmRefusal[];
}
