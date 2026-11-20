import type { ConditionPhotoRoom } from '../interfaces/condition-photo-description.interface.js';

// The API's ConditionPhotoRoom values (the type checks this list against the generated schema).
export const ROOMS = [
  'KITCHEN',
  'BATHROOM',
  'BEDROOM',
  'LIVING',
  'HALL',
  'BALCONY',
  'OTHER',
] as const satisfies readonly ConditionPhotoRoom[];
