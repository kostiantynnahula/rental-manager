import type { ConditionPhotoEvent } from '../../generated/prisma/enums.js';

// What the user sets once for the whole upload request.
export interface ConditionPhotoUploadMeta {
  event: ConditionPhotoEvent;
  takenOn: Date;
  note: string | null;
}
