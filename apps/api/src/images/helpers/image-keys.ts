import type { ImageKeyPrefixes } from '../interfaces/image-key-prefixes.interface.js';
import type { ImageKeys } from '../interfaces/image-keys.interface.js';

// `<prefix>/YYYY/MM/<id>.<ext>` + `<thumbnail prefix>/YYYY/MM/<id>.webp`. `day` is a date-only value (UTC midnight,
// see common/helpers/date-only.ts). The original filename is never part of a key.
export function imageKeys(
  prefixes: ImageKeyPrefixes,
  id: string,
  ext: string,
  day: Date,
): ImageKeys {
  const year = day.getUTCFullYear();
  const month = String(day.getUTCMonth() + 1).padStart(2, '0');
  return {
    storageKey: `${prefixes.original}/${year}/${month}/${id}.${ext}`,
    thumbnailKey: `${prefixes.thumbnail}/${year}/${month}/${id}.webp`,
  };
}
