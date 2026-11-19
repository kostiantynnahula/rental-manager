import { BadRequestException } from '@nestjs/common';
import type { PreparedImage } from '../interfaces/prepared-image.interface.js';
import type { Thumbnail } from '../interfaces/thumbnail.interface.js';
import { detectImageType } from './image-type.js';
import { makeThumbnail } from './thumbnail.js';
import { sha256Hex } from './sha256.js';

// Every file is checked before anything is stored, so a bad one rejects the whole request. `findExisting` returns
// the record of the same file already stored (→ a duplicate), or throws (e.g. 409: it belongs to another place).
export async function prepareImages<T>(
  files: Express.Multer.File[],
  findExisting: (sha256: string) => Promise<T | null>,
): Promise<PreparedImage<T>[]> {
  // Cheap checks first, for every file: the type and findExisting.
  const checked: Omit<PreparedImage<T>, 'thumbnail'>[] = [];
  for (const [i, file] of files.entries()) {
    const result = await detectImageType(file.buffer);
    if (!result.ok) throw new BadRequestException(`files[${i}]: ${result.message}`);
    const sha256 = sha256Hex(file.buffer);
    const existing = await findExisting(sha256);
    checked.push({ file, type: result.type, sha256, existing });
  }

  // Then the decode (the thumbnail), only for the files this request stores: not a duplicate, not a repeat.
  const seen = new Set<string>();
  const prepared: PreparedImage<T>[] = [];
  for (const [i, item] of checked.entries()) {
    const isNew = !item.existing && !seen.has(item.sha256);
    seen.add(item.sha256);
    let thumbnail: Thumbnail | null = null;
    if (isNew) {
      try {
        thumbnail = await makeThumbnail(item.file.buffer);
      } catch {
        throw new BadRequestException(`files[${i}]: the image is corrupt or can't be decoded`);
      }
    }
    prepared.push({ ...item, thumbnail });
  }
  return prepared;
}
