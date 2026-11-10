import type { ReadingHistoryItem } from '@/lib/api/queries/readings';
import type { Zone } from '@/lib/utilities';

// Distinct photos of the item's values (in zone order), each with the zones read from it.
export function historyPhotos(item: ReadingHistoryItem): { photoId: string; zones: Zone[] }[] {
  const byPhoto = new Map<string, Zone[]>();
  for (const v of item.values) {
    if (v.photoId) byPhoto.set(v.photoId, [...(byPhoto.get(v.photoId) ?? []), v.zone]);
  }
  return [...byPhoto].map(([photoId, zones]) => ({ photoId, zones }));
}
