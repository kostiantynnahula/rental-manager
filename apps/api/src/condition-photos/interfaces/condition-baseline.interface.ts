import type { ConditionPhoto } from '../../generated/prisma/client.js';

// The apartment's state on a date: the latest check-in up to it and the changes since.
export interface ConditionBaseline {
  // The day of the latest CHECK_IN ≤ date; null = no check-in photos yet (then all CHANGE photos up to the date).
  checkInOn: Date | null;
  // That day's CHECK_IN photos, then the CHANGE photos from it up to the date; oldest first.
  photos: ConditionPhoto[];
}
