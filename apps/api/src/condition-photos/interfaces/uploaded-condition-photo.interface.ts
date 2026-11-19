import type { ConditionPhoto } from '../../generated/prisma/client.js';

export interface UploadedConditionPhoto {
  photo: ConditionPhoto;
  duplicate: boolean;
}
