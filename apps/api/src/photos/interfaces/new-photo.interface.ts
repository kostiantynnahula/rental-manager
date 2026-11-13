import type { Prisma } from '../../generated/prisma/client.js';
import type { Thumbnail } from './thumbnail.interface.js';
import type { PreparedPhoto } from './prepared-photo.interface.js';

// A file the request stores as a new photo: the validated file and the row it becomes.
export interface NewPhoto {
  item: PreparedPhoto & { thumbnail: Thumbnail };
  row: Prisma.PhotoCreateManyInput & { id: string; storageKey: string; thumbnailKey: string };
}
