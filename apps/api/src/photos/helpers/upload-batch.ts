import { todayDateOnly } from '../../common/helpers/date-only.js';
import { PhotoParseStatus } from '../../generated/prisma/enums.js';
import type { NewPhoto } from '../interfaces/new-photo.interface.js';
import type { PhotoBatch } from '../interfaces/photo-batch.interface.js';
import type { PreparedPhoto } from '../interfaces/prepared-photo.interface.js';
import type { UploadedPhoto } from '../interfaces/uploaded-photo.interface.js';
import { cleanOriginalFilename } from './original-filename.js';
import { photoKeys } from './photo-keys.js';
import { randomUUID } from 'node:crypto';

// What the request stores: the files validateAll made a thumbnail for (not already stored, not a repeat).
export function newPhotos(
  prepared: PreparedPhoto[],
  apartmentId: string | null,
  { batchId, replyTo }: PhotoBatch,
  userId: string,
): NewPhoto[] {
  const day = todayDateOnly();
  const photos: NewPhoto[] = [];
  for (const item of prepared) {
    const { thumbnail } = item;
    if (!thumbnail) continue;
    const id = randomUUID();
    photos.push({
      item: { ...item, thumbnail },
      row: {
        id,
        apartmentId,
        ...photoKeys(id, item.type.ext, day),
        mimeType: item.type.mime,
        size: item.file.size,
        sha256: item.sha256,
        width: thumbnail.width,
        height: thumbnail.height,
        originalFilename: cleanOriginalFilename(item.file.originalname),
        uploadedById: userId,
        batchId,
        replyTo,
        // Every newly stored photo gets a parse job after the commit.
        parseStatus: PhotoParseStatus.PENDING,
      },
    });
  }
  return photos;
}

// One answer per uploaded file, in request order. `stored` = storeAll's result by sha256.
export function uploadAnswers(
  prepared: PreparedPhoto[],
  stored: Map<string, UploadedPhoto>,
): UploadedPhoto[] {
  return prepared.map(({ sha256, existing, thumbnail }) => {
    if (existing) return { photo: existing, duplicate: true };
    const { photo, duplicate } = stored.get(sha256)!;
    // No thumbnail and not stored before = a repeat of an earlier file of this request.
    return { photo, duplicate: duplicate || !thumbnail };
  });
}
