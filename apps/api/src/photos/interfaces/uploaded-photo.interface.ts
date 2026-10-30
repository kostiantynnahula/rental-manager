import type { Photo } from '../../generated/prisma/client.js';

export interface UploadedPhoto {
  photo: Photo;
  duplicate: boolean;
}
