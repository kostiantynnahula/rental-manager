import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApartmentsService } from '../apartments/apartments.service.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { todayDateOnly } from '../common/helpers/date-only.js';
import type { Photo, Prisma } from '../generated/prisma/client.js';
import { PhotoParseStatus, ReadingSource, ReadingStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PhotoJobsService } from '../queue/photo-jobs.service.js';
import { StorageService } from '../storage/storage.service.js';
import { detectImageType } from './helpers/image-type.js';
import { cleanOriginalFilename } from './helpers/original-filename.js';
import { photoKeys } from './helpers/photo-keys.js';
import { photoWithReadingsInclude, type PhotoWithReadings } from './helpers/photo-with-readings.js';
import {
  activeReadingValue,
  photoWithUsageInclude,
  type PhotoWithUsage,
} from './helpers/photo-with-usage.js';
import { sha256Hex } from './helpers/sha256.js';
import { SetParseResultDto } from './dto/set-parse-result.dto.js';
import { makeThumbnail, THUMBNAIL_MIME_TYPE } from './helpers/thumbnail.js';
import type { ImageType } from './interfaces/image-type.interface.js';
import type { PhotoFile } from './interfaces/photo-file.interface.js';
import type { Thumbnail } from './interfaces/thumbnail.interface.js';
import type { UploadedPhoto } from './interfaces/uploaded-photo.interface.js';

// "Нерозібрані": nothing taken from the photo yet (no value of a non-cancelled reading), or a value still in a DRAFT
// (e.g. proposed by the worker) — it stays here until a human confirms it.
const unassignedPhoto = {
  OR: [
    { readingValues: { none: activeReadingValue } },
    { readingValues: { some: { reading: { status: ReadingStatus.DRAFT } } } },
  ],
} satisfies Prisma.PhotoWhereInput;

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly apartments: ApartmentsService,
    private readonly photoJobs: PhotoJobsService,
  ) {}

  // apartmentId null = inbox (no apartment yet).
  async upload(
    apartmentId: string | null,
    files: Express.Multer.File[] | undefined,
    userId: string,
  ): Promise<UploadedPhoto[]> {
    if (apartmentId) {
      const apartment = await this.apartments.findOrThrow(apartmentId);
      if (!apartment.isActive) throw new BadRequestException('Apartment is archived');
    }
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
      const stored = await this.store(apartmentId, file, type, sha256, thumbnail, userId);
      // Only a newly stored photo gets a job; `duplicate` also covers losing a race to a parallel upload
      // of the same file (the winner enqueued it).
      if (!stored.duplicate) await this.photoJobs.enqueueParse(stored.photo.id);
      results.push(stored);
    }
    return results;
  }

  async list(apartmentId: string, unassigned: boolean): Promise<PhotoWithUsage[]> {
    await this.apartments.findOrThrow(apartmentId);
    return this.prisma.photo.findMany({
      where: { apartmentId, ...(unassigned && unassignedPhoto) },
      include: photoWithUsageInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  // Inbox: photos without an apartment.
  async listInbox(): Promise<PhotoWithUsage[]> {
    return this.prisma.photo.findMany({
      where: { apartmentId: null },
      include: photoWithUsageInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  // A human picks the apartment (e.g. an inbox photo the worker couldn't match), then the photo is parsed again
  // against that apartment's meters. Only while the photo backs no reading value at all — cancelled ones included:
  // they keep pointing at the photo, and a photo's values must be of its apartment. An inbox photo has none
  // (draft-values assigns it on the first one). The same apartment again = a re-parse.
  async assignApartment(id: string, apartmentId: string): Promise<PhotoWithReadings> {
    // A body reference: a bad one is a 400, not a 404.
    const apartment = await this.prisma.apartment.findUnique({ where: { id: apartmentId } });
    if (!apartment) throw new BadRequestException('apartmentId: apartment not found');
    if (!apartment.isActive) throw new BadRequestException('Apartment is archived');
    // Conditional, so a value linked meanwhile can't slip through between a check and the update.
    const { count } = await this.prisma.photo.updateMany({
      where: { id, readingValues: { none: {} } },
      data: { apartmentId, parseStatus: PhotoParseStatus.PENDING, parseNote: null },
    });
    if (count === 0) {
      const exists = await this.prisma.photo.count({ where: { id } });
      if (!exists) throw new NotFoundException('Photo not found');
      throw new ConflictException("Photo has reading values — it can't move to another apartment");
    }
    await this.photoJobs.enqueueParse(id, { reparse: true });
    return this.findOrThrow(id);
  }

  // The worker's verdict when its job ends (API keys only: a human never sets it).
  async setParseResult(id: string, dto: SetParseResultDto, user: AuthUser): Promise<void> {
    if (!user.apiKeyId) throw new ForbiddenException('Only API keys can set the parse result');
    const { count } = await this.prisma.photo.updateMany({
      where: { id },
      data: { parseStatus: dto.status, parseNote: dto.note ?? null },
    });
    if (count === 0) throw new NotFoundException('Photo not found');
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
    this.assertOfApartment(photo, apartmentId);
    return photo;
  }

  // For the worker's draft values: the photo must be of the meter's apartment. An inbox photo gets that apartment
  // here, inside the caller's transaction (rolled back if the draft fails). Other errors as findForApartmentOrThrow.
  async claimForApartment(
    id: string,
    apartmentId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    // Conditional update: of two parallel claims only one sees apartmentId null.
    const { count } = await tx.photo.updateMany({
      where: { id, apartmentId: null },
      data: { apartmentId },
    });
    if (count > 0) return;
    const photo = await tx.photo.findUnique({ where: { id }, select: { apartmentId: true } });
    this.assertOfApartment(photo, apartmentId);
  }

  // One place for the photo-reference rule of both reading paths, so they answer the same (400: a bad reference
  // in the request body).
  private assertOfApartment<T extends Pick<Photo, 'apartmentId'>>(
    photo: T | null,
    apartmentId: string,
  ): asserts photo is T {
    if (!photo) throw new BadRequestException('photoId: photo not found');
    if (photo.apartmentId === null) {
      throw new BadRequestException(
        'photoId: the photo is in the inbox — assign an apartment first',
      );
    }
    if (photo.apartmentId !== apartmentId) {
      throw new BadRequestException('photoId: the photo belongs to another apartment');
    }
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
      const linked = await tx.readingValue.count({ where: { photoId: id, ...activeReadingValue } });
      if (linked > 0) throw new ConflictException('Photo is linked to a reading — cancel it first');
      // Cancelled readings stay as history, just without the photo (the FK is RESTRICT); their values
      // become MANUAL (CHECK reading_values_source_matches_photo).
      await tx.readingValue.updateMany({
        where: { photoId: id },
        data: { photoId: null, source: ReadingSource.MANUAL },
      });
      await tx.photo.delete({ where: { id } });
      return found;
    });
    // Row first, objects second: a failure here leaves an orphan object, never a dangling row.
    await this.deleteObjects(photo.storageKey, photo.thumbnailKey);
  }

  // Same place (same apartment, or both inbox) → the existing record. An inbox upload of a photo that already has
  // an apartment is a duplicate too (it's already sorted). An apartment upload of a photo that is in the inbox or
  // in another apartment → 409 (moving it out of the inbox is a separate action).
  private async findDuplicate(sha256: string, apartmentId: string | null): Promise<Photo | null> {
    const existing = await this.prisma.photo.findUnique({ where: { sha256 } });
    if (!existing || apartmentId === null || existing.apartmentId === apartmentId) return existing;
    throw new ConflictException(
      existing.apartmentId === null
        ? 'This photo is already in the inbox'
        : 'This photo was already uploaded for another apartment',
    );
  }

  // Objects first, then the row; if the insert fails, the objects are removed again.
  private async store(
    apartmentId: string | null,
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
          // Every newly stored photo gets a parse job right after this.
          parseStatus: PhotoParseStatus.PENDING,
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
