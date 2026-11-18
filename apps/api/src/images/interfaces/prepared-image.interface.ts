import type { ImageType } from './image-type.interface.js';
import type { Thumbnail } from './thumbnail.interface.js';

// An uploaded file that passed validation. T = the record of the same file already stored (a duplicate).
export interface PreparedImage<T> {
  file: Express.Multer.File;
  type: ImageType;
  sha256: string;
  // Made only for a file this request stores; null = not stored (already stored, or a repeat of an earlier file
  // of the request).
  thumbnail: Thumbnail | null;
  // The same file already stored (→ answered as a duplicate, not stored).
  existing: T | null;
}
