import type { Photo } from '../../generated/prisma/client.js';
import type { PreparedImage } from '../../images/interfaces/prepared-image.interface.js';

// The existing record = the same file already stored in the same place.
export type PreparedPhoto = PreparedImage<Photo>;
