import type { ImageType } from './image-type.interface.js';
import type { Thumbnail } from './thumbnail.interface.js';

// An uploaded file that passed validation, ready to be stored.
export interface PreparedPhoto {
  file: Express.Multer.File;
  type: ImageType;
  sha256: string;
  thumbnail: Thumbnail;
}
