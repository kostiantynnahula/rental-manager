import type { ConditionPhotoEvent } from '../../generated/prisma/enums.js';

// What the vector search matches on: the query text and the list's filters (dates as YYYY-MM-DD).
export interface ConditionPhotoSearchFilters {
  q: string;
  event?: ConditionPhotoEvent;
  from?: string;
  to?: string;
}
