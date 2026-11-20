import type { ConditionPhotoEvent } from '../../generated/prisma/enums.js';

// One case of eval/search-cases.json: a query and the photos a good search must return.
export interface SearchCase {
  apartmentId: string;
  q: string;
  event?: ConditionPhotoEvent;
  expected: string[];
}
