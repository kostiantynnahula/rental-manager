import type { ConditionPhoto, Prisma } from '../../generated/prisma/client.js';
import type { PreparedImage } from '../../images/interfaces/prepared-image.interface.js';
import type { Thumbnail } from '../../images/interfaces/thumbnail.interface.js';

// A file the request stores as a new photo: the validated file and the row it becomes.
export interface NewConditionPhoto {
  item: PreparedImage<ConditionPhoto> & { thumbnail: Thumbnail };
  row: Prisma.ConditionPhotoCreateManyInput & {
    id: string;
    storageKey: string;
    thumbnailKey: string;
  };
}
