import type { ConditionPhotoRoom } from '../constants/condition-photo-description.js';

// ConditionPhoto.description as stored (Json): the shape of ConditionPhotoDescriptionDto, validated on the way in.
export interface ConditionPhotoDescription {
  room: ConditionPhotoRoom;
  items: { name: string; count?: number; condition?: string }[];
  summary: string;
}
