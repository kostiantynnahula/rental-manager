import sharp from 'sharp';
import type { Thumbnail } from '../interfaces/thumbnail.interface.js';

export const THUMBNAIL_MIME_TYPE = 'image/webp';
const THUMBNAIL_MAX_SIDE = 400;

// Throws if sharp can't decode the image (corrupt or truncated file).
export async function makeThumbnail(original: Buffer): Promise<Thumbnail> {
  const image = sharp(original, { failOn: 'error' });
  const { autoOrient } = await image.metadata();
  const buffer = await image
    // Applies the EXIF orientation, so phone photos aren't sideways.
    .autoOrient()
    .resize(THUMBNAIL_MAX_SIDE, THUMBNAIL_MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return { buffer, width: autoOrient.width, height: autoOrient.height };
}
