import type { PhotoSearchability } from '../../condition-photos/interfaces/photo-searchability.interface.js';
import { ConditionPhotoIndexStatus } from '../../generated/prisma/enums.js';
import type { SearchCase } from '../interfaces/search-case.interface.js';

// Why an expected photo can never be returned for this case, or null if search() can return it.
export function unsearchable(c: SearchCase, photo: PhotoSearchability | undefined): string | null {
  if (!photo) return 'not found';
  if (photo.apartmentId !== c.apartmentId) return 'another apartment';
  if (c.event && photo.event !== c.event) return `event ${photo.event}`;
  if (photo.indexStatus !== ConditionPhotoIndexStatus.INDEXED) return photo.indexStatus;
  if (!photo.embedded) return 'no embedding of the current model (run embed:backfill)';
  return null;
}
