import { StreamableFile } from '@nestjs/common';
import type { ImageFile } from '../interfaces/image-file.interface.js';

// Files are immutable (a new upload gets a new id), so the browser may cache them for a day.
// private: never in shared caches — they're behind auth.
export const FILE_CACHE_CONTROL = 'private, max-age=86400';

export function toStreamableFile({ body, mimeType, contentLength }: ImageFile): StreamableFile {
  return new StreamableFile(body, {
    type: mimeType,
    length: contentLength,
    disposition: 'inline',
  });
}
