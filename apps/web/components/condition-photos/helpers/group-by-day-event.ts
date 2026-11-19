import type { ConditionPhoto, ConditionPhotoEvent } from '@/lib/api/queries/condition-photos';

export interface ConditionPhotoGroup {
  key: string;
  takenOn: string;
  event: ConditionPhotoEvent;
  photos: ConditionPhoto[];
}

// The API sorts by takenOn desc, uploadedAt desc: groups keep that order (first appearance wins).
export function groupByDayEvent(photos: ConditionPhoto[]): ConditionPhotoGroup[] {
  const groups = new Map<string, ConditionPhotoGroup>();
  for (const photo of photos) {
    const key = `${photo.takenOn}|${photo.event}`;
    const group = groups.get(key);
    if (group) group.photos.push(photo);
    else groups.set(key, { key, takenOn: photo.takenOn, event: photo.event, photos: [photo] });
  }
  return [...groups.values()];
}
