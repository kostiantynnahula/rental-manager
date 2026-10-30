import type { PhotoKeys } from '../interfaces/photo-keys.interface.js';

// `day` is a date-only value (UTC midnight, see common/helpers/date-only.ts). The original
// filename is never part of a key.
export function photoKeys(id: string, ext: string, day: Date): PhotoKeys {
  const year = day.getUTCFullYear();
  const month = String(day.getUTCMonth() + 1).padStart(2, '0');
  return {
    storageKey: `photos/${year}/${month}/${id}.${ext}`,
    thumbnailKey: `thumbnails/${year}/${month}/${id}.webp`,
  };
}
