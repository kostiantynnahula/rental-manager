import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApartmentsService } from '../apartments/apartments.service.js';
import { todayDateOnly } from '../common/helpers/date-only.js';
import type { Photo } from '../generated/prisma/client.js';
import { ReadingStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { detectImageType } from './helpers/image-type.js';
import { cleanOriginalFilename } from './helpers/original-filename.js';
import { photoKeys } from './helpers/photo-keys.js';
import { photoWithReadingsInclude, type PhotoWithReadings } from './helpers/photo-with-readings.js';
import { sha256Hex } from './helpers/sha256.js';
import { makeThumbnail, THUMBNAIL_MIME_TYPE } from './helpers/thumbnail.js';
import type { ImageType } from './interfaces/image-type.interface.js';
import type { PhotoFile } from './interfaces/photo-file.interface.js';
import type { Thumbnail } from './interfaces/thumbnail.interface.js';
import type { UploadedPhoto } from './interfaces/uploaded-photo.interface.js';

// "Linked" = referenced by a reading that isn't CANCELLED.
const activeReading = { status: { not: ReadingStatus.CANCELLED } };

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly apartments: ApartmentsService,
  ) {}

  async upload(
    apartmentId: string,
    files: Express.Multer.File[] | undefined,
    userId: string,
  ): Promise<UploadedPhoto[]> {
    const apartment = await this.apartments.findOrThrow(apartmentId);
    if (!apartment.isActive) throw new BadRequestException('Apartment is archived');
    if (!files?.length) throw new BadRequestException('No files: send them in the "files" field');

    // Validate everything before storing anything, so a bad file rejects the whole request.
    const prepared: { file: Express.Multer.File; type: ImageType; sha256: string }[] = [];
    for (const [i, file] of files.entries()) {
      const result = await detectImageType(file.buffer);
      if (!result.ok) throw new BadRequestException(`files[${i}]: ${result.message}`);
      prepared.push({ file, type: result.type, sha256: sha256Hex(file.buffer) });
    }

    // Sequential: two identical files in one request dedup against each other.
    const results: UploadedPhoto[] = [];
    for (const [i, { file, type, sha256 }] of prepared.entries()) {
      const existing = await this.findDuplicate(sha256, apartmentId);
      if (existing) {
        results.push({ photo: existing, duplicate: true });
        continue;
      }
      let thumbnail: Thumbnail;
      try {
        thumbnail = await makeThumbnail(file.buffer);
      } catch {
        throw new BadRequestException(`files[${i}]: the image is corrupt or can't be decoded`);
      }
      results.push(await this.store(apartmentId, file, type, sha256, thumbnail, userId));
    }
    return results;
  }

  async list(apartmentId: string, unassigned: boolean): Promise<Photo[]> {
    await this.apartments.findOrThrow(apartmentId);
    return this.prisma.photo.findMany({
      where: { apartmentId, ...(unassigned && { readings: { none: activeReading } }) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findOrThrow(id: string): Promise<PhotoWithReadings> {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
      include: photoWithReadingsInclude,
    });
    if (!photo) throw new NotFoundException('Photo not found');
    return photo;
  }

  // For readings: the photo is part of the request body, so a bad reference is a 400.
  async findForApartmentOrThrow(id: string, apartmentId: string): Promise<Photo> {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new BadRequestException('photoId: photo not found');
    if (photo.apartmentId !== apartmentId) {
      throw new BadRequestException('photoId: the photo belongs to another apartment');
    }
    return photo;
  }

  async openFile(id: string, variant: 'original' | 'thumbnail'): Promise<PhotoFile> {
    const photo = await this.findOrThrow(id);
    const isOriginal = variant === 'original';
    const object = await this.storage.getStream(isOriginal ? photo.storageKey : photo.thumbnailKey);
    return { ...object, mimeType: isOriginal ? photo.mimeType : THUMBNAIL_MIME_TYPE };
  }

  async delete(id: string): Promise<void> {
    const photo = await this.prisma.$transaction(async (tx) => {
      const found = await tx.photo.findUnique({ where: { id } });
      if (!found) throw new NotFoundException('Photo not found');
      const linked = await tx.reading.count({ where: { photoId: id, ...activeReading } });
      if (linked > 0) throw new ConflictException('Photo is linked to a reading — cancel it first');
      // Cancelled readings stay as history, just without the photo (the FK is RESTRICT).
      await tx.reading.updateMany({ where: { photoId: id }, data: { photoId: null } });
      await tx.photo.delete({ where: { id } });
      return found;
    });
    // Row first, objects second: a failure here leaves an orphan object, never a dangling row.
    await this.deleteObjects(photo.storageKey, photo.thumbnailKey);
  }

  private async findDuplicate(sha256: string, apartmentId: string): Promise<Photo | null> {
    const existing = await this.prisma.photo.findUnique({ where: { sha256 } });
    if (existing && existing.apartmentId !== apartmentId) {
      throw new ConflictException('This photo was already uploaded for another apartment');
    }
    return existing;
  }

  // Objects first, then the row; if the insert fails, the objects are removed again.
  private async store(
    apartmentId: string,
    file: Express.Multer.File,
    type: ImageType,
    sha256: string,
    thumbnail: Thumbnail,
    userId: string,
  ): Promise<UploadedPhoto> {
    const id = randomUUID();
    const keys = photoKeys(id, type.ext, todayDateOnly());
    try {
      // The original is stored byte-for-byte; only the thumbnail is derived.
      await this.storage.put(keys.storageKey, file.buffer, type.mime);
      await this.storage.put(keys.thumbnailKey, thumbnail.buffer, THUMBNAIL_MIME_TYPE);
      const photo = await this.prisma.photo.create({
        data: {
          id,
          apartmentId,
          ...keys,
          mimeType: type.mime,
          size: file.size,
          sha256,
          width: thumbnail.width,
          height: thumbnail.height,
          originalFilename: cleanOriginalFilename(file.originalname),
          uploadedById: userId,
        },
      });
      return { photo, duplicate: false };
    } catch (e) {
      await this.deleteObjects(keys.storageKey, keys.thumbnailKey);
      // A parallel upload of the same file won the sha256 unique index: return its record.
      const winner = await this.findDuplicate(sha256, apartmentId);
      if (winner) return { photo: winner, duplicate: true };
      throw e;
    }
  }

  private async deleteObjects(...keys: string[]): Promise<void> {
    const results = await Promise.allSettled(keys.map((key) => this.storage.delete(key)));
    results.forEach((r, i) => {
      if (r.status === 'rejected') this.logger.error(`Orphaned storage object: ${keys[i]}`);
    });
  }
}
