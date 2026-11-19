import { imageKeys } from '../../images/helpers/image-keys.js';
import type { ImageKeys } from '../../images/interfaces/image-keys.interface.js';

// Own prefixes, so condition photos never mix with meter photos in the bucket.
export function conditionPhotoKeys(id: string, ext: string, day: Date): ImageKeys {
  return imageKeys(
    { original: 'condition-photos', thumbnail: 'condition-thumbnails' },
    id,
    ext,
    day,
  );
}
