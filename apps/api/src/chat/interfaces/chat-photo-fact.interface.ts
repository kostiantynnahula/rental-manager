import type { ConditionPhotoEvent } from '../../generated/prisma/enums.js';
import type { ConditionPhotoRoom } from '../../condition-photos/constants/condition-photo-description.js';

// A condition photo as the agent sees it (tool output). No storage keys, no bytes.
export interface ChatPhotoFact {
  photoId: string;
  event: ConditionPhotoEvent;
  takenOn: string;
  // null = not described yet (the worker hasn't run, or failed): the agent must not guess what it shows.
  room: ConditionPhotoRoom | null;
  summary: string | null;
  items: { name: string; count?: number; condition?: string }[];
  note: string | null;
}
