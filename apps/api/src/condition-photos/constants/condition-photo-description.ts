// The room a condition photo shows (the worker's description). A TS const, not a Prisma enum: the description is
// stored as Json.
export const CONDITION_PHOTO_ROOMS = [
  'KITCHEN',
  'BATHROOM',
  'BEDROOM',
  'LIVING',
  'HALL',
  'BALCONY',
  'OTHER',
] as const;

export type ConditionPhotoRoom = (typeof CONDITION_PHOTO_ROOMS)[number];

export const DESCRIPTION_MAX_ITEMS = 100;
export const DESCRIPTION_ITEM_NAME_MAX_LENGTH = 200;
export const DESCRIPTION_ITEM_CONDITION_MAX_LENGTH = 500;
export const DESCRIPTION_SUMMARY_MAX_LENGTH = 2000;
export const DESCRIPTION_ERROR_MAX_LENGTH = 1000;
