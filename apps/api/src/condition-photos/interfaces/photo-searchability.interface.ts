import type {
  ConditionPhotoEvent,
  ConditionPhotoIndexStatus,
} from '../../generated/prisma/enums.js';

// What decides whether search() can return a photo (the eval uses it to tell a broken case from a miss).
export interface PhotoSearchability {
  apartmentId: string;
  event: ConditionPhotoEvent;
  indexStatus: ConditionPhotoIndexStatus;
  // Has a TEXT embedding of the current model (after a model change: false until the backfill).
  embedded: boolean;
}
