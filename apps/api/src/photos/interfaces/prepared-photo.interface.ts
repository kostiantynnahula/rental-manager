import type { Photo } from '../../generated/prisma/client.js';
import type { ImageType } from './image-type.interface.js';
import type { Thumbnail } from './thumbnail.interface.js';

// An uploaded file that passed validation, ready to be stored.
export interface PreparedPhoto {
  file: Express.Multer.File;
  type: ImageType;
  sha256: string;
  // Made only for a file this request stores; null = not stored (already stored, or a repeat of an earlier file
  // of the request).
  thumbnail: Thumbnail | null;
  // The same file already stored in the same place (→ answered as a duplicate, not stored).
  existing: Photo | null;
}
