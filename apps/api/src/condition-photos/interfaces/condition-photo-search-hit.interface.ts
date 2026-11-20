import type { ConditionPhoto } from '../../generated/prisma/client.js';

export interface ConditionPhotoSearchHit {
  photo: ConditionPhoto;
  // 1 − cosine distance: higher = closer.
  score: number;
}
