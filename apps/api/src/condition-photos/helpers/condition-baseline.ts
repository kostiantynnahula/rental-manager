import type { ConditionPhoto } from '../../generated/prisma/client.js';
import { ConditionPhotoEvent } from '../../generated/prisma/enums.js';
import type { ConditionBaseline } from '../interfaces/condition-baseline.interface.js';

// "What to check at check-out": the photos of the latest CHECK_IN day ≤ date, plus the CHANGE photos taken on or after
// that day, up to the date. Earlier check-ins (a previous lease) and CHECK_OUT photos are not part of the state.
export function conditionBaseline(photos: ConditionPhoto[], date: Date): ConditionBaseline {
  const upToDate = photos.filter((p) => p.takenOn.getTime() <= date.getTime());
  const checkInOn = upToDate
    .filter((p) => p.event === ConditionPhotoEvent.CHECK_IN)
    .reduce<Date | null>((latest, p) => (latest && latest >= p.takenOn ? latest : p.takenOn), null);
  const since = checkInOn?.getTime() ?? -Infinity;
  const kept = upToDate.filter((p) =>
    p.event === ConditionPhotoEvent.CHECK_IN
      ? p.takenOn.getTime() === since
      : p.event === ConditionPhotoEvent.CHANGE && p.takenOn.getTime() >= since,
  );
  kept.sort(
    (a, b) =>
      a.takenOn.getTime() - b.takenOn.getTime() ||
      eventOrder(a) - eventOrder(b) ||
      a.uploadedAt.getTime() - b.uploadedAt.getTime() ||
      a.id.localeCompare(b.id),
  );
  return { checkInOn, photos: kept };
}

// The check-in comes before a change made on the same day.
function eventOrder(photo: ConditionPhoto): number {
  return photo.event === ConditionPhotoEvent.CHECK_IN ? 0 : 1;
}
