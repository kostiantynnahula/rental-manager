import { randomUUID } from 'node:crypto';
import { todayDateOnly } from '../../common/helpers/date-only.js';
import type { ConditionPhoto } from '../../generated/prisma/client.js';
import type { PreparedImage } from '../../images/interfaces/prepared-image.interface.js';
import type { ConditionPhotoUploadMeta } from '../interfaces/condition-photo-upload-meta.interface.js';
import type { NewConditionPhoto } from '../interfaces/new-condition-photo.interface.js';
import type { UploadedConditionPhoto } from '../interfaces/uploaded-condition-photo.interface.js';
import { conditionPhotoKeys } from './condition-photo-keys.js';

// What the request stores: the files prepareImages made a thumbnail for (not already stored, not a repeat).
export function newConditionPhotos(
  prepared: PreparedImage<ConditionPhoto>[],
  apartmentId: string,
  meta: ConditionPhotoUploadMeta,
): NewConditionPhoto[] {
  // Keys by the upload day (Kyiv), like meter photos — not by takenOn, which can be edited.
  const day = todayDateOnly();
  const photos: NewConditionPhoto[] = [];
  for (const item of prepared) {
    const { thumbnail } = item;
    if (!thumbnail) continue;
    const id = randomUUID();
    photos.push({
      item: { ...item, thumbnail },
      row: {
        id,
        apartmentId,
        ...meta,
        ...conditionPhotoKeys(id, item.type.ext, day),
        mimeType: item.type.mime,
        size: item.file.size,
        sha256: item.sha256,
        width: thumbnail.width,
        height: thumbnail.height,
      },
    });
  }
  return photos;
}

// One answer per uploaded file, in request order. `stored` = the stored photos by sha256.
export function uploadAnswers(
  prepared: PreparedImage<ConditionPhoto>[],
  stored: Map<string, UploadedConditionPhoto>,
): UploadedConditionPhoto[] {
  return prepared.map(({ sha256, existing, thumbnail }) => {
    if (existing) return { photo: existing, duplicate: true };
    const { photo, duplicate } = stored.get(sha256)!;
    // No thumbnail and not stored before = a repeat of an earlier file of this request.
    return { photo, duplicate: duplicate || !thumbnail };
  });
}
