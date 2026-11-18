import { imageKeys } from '../../images/helpers/image-keys.js';
import type { ImageKeys } from '../../images/interfaces/image-keys.interface.js';

export function photoKeys(id: string, ext: string, day: Date): ImageKeys {
  return imageKeys({ original: 'photos', thumbnail: 'thumbnails' }, id, ext, day);
}
