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
import type { Photo, Prisma } from '../generated/prisma/client.js';
import { PhotoParseStatus, ReadingSource, ReadingStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PhotoJobsService } from '../queue/photo-jobs.service.js';
import { StorageService } from '../storage/storage.service.js';
import { detectImageType } from './helpers/image-type.js';
import { photoWithReadingsInclude, type PhotoWithReadings } from './helpers/photo-with-readings.js';
import {
  activeReadingValue,
  photoWithUsageInclude,
  type PhotoWithUsage,
} from './helpers/photo-with-usage.js';
import { sha256Hex } from './helpers/sha256.js';
import { SetParseResultDto } from './dto/set-parse-result.dto.js';
import { makeThumbnail, THUMBNAIL_MIME_TYPE } from './helpers/thumbnail.js';
import { newPhotos, uploadAnswers } from './helpers/upload-batch.js';
import type { NewPhoto } from './interfaces/new-photo.interface.js';
import type { PhotoBatch } from './interfaces/photo-batch.interface.js';
import type { PhotoFile } from './interfaces/photo-file.interface.js';
import type { PreparedPhoto } from './interfaces/prepared-photo.interface.js';
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

  // apartmentId null = inbox (no apartment yet). One request = one batch: every photo it newly stores gets the same
  // batchId (and replyTo, an opaque client string); duplicates keep their own.
  async upload(
    apartmentId: string | null,
    files: Express.Multer.File[] | undefined,
    userId: string,
    replyTo?: string,
  ): Promise<UploadedPhoto[]> {
    if (apartmentId) {
      const apartment = await this.apartments.findOrThrow(apartmentId);
      if (!apartment.isActive) throw new BadRequestException('Apartment is archived');
    }
    if (!files?.length) throw new BadRequestException('No files: send them in the "files" field');

    const prepared = await this.validateAll(files, apartmentId);
    const batch: PhotoBatch = { batchId: randomUUID(), replyTo: replyTo ?? null };
    const stored = await this.storeAll(
      newPhotos(prepared, apartmentId, batch, userId),
      apartmentId,
    );
    // Jobs only after the commit, so none points at a rolled-back photo. A lost race is a duplicate: no job.
    for (const { photo, duplicate } of stored.values()) {
      if (!duplicate) await this.photoJobs.enqueueParse(photo.id);
    }
    return uploadAnswers(prepared, stored);
  }

  // Every file is checked before anything is stored, so a bad one rejects the whole request: the type, the
  // decode (thumbnail) and a file that belongs to another place (409).
  private async validateAll(
    files: Express.Multer.File[],
    apartmentId: string | null,
  ): Promise<PreparedPhoto[]> {
    // Cheap checks first, for every file: the type and a file that belongs to another place (409).
    const checked: Omit<PreparedPhoto, 'thumbnail'>[] = [];
    for (const [i, file] of files.entries()) {
      const result = await detectImageType(file.buffer);
      if (!result.ok) throw new BadRequestException(`files[${i}]: ${result.message}`);
      const sha256 = sha256Hex(file.buffer);
      const existing = await this.findDuplicate(sha256, apartmentId);
      checked.push({ file, type: result.type, sha256, existing });
    }

    // Then the decode (the thumbnail), only for the files this request stores: not a duplicate, not a repeat.
    const seen = new Set<string>();
    const prepared: PreparedPhoto[] = [];
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
    if (existing) this.assertSamePlace(existing, apartmentId);
    return existing;
  }

  private assertSamePlace(existing: Photo, apartmentId: string | null): void {
    if (apartmentId === null || existing.apartmentId === apartmentId) return;
    throw new ConflictException(
      existing.apartmentId === null
        ? 'This photo is already in the inbox'
        : 'This photo was already uploaded for another apartment',
    );
  }

  // All or nothing: the objects, then every row in one transaction. Any failure → the objects are deleted, no row.
  // Result by sha256.
  private async storeAll(
    photos: NewPhoto[],
    apartmentId: string | null,
  ): Promise<Map<string, UploadedPhoto>> {
    const putKeys: string[] = [];
    let saved: Photo[];
    try {
      for (const { item, row } of photos) {
        // The original is stored byte-for-byte; only the thumbnail is derived.
        await this.storage.put(row.storageKey, item.file.buffer, item.type.mime);
        putKeys.push(row.storageKey);
        await this.storage.put(row.thumbnailKey, item.thumbnail.buffer, THUMBNAIL_MIME_TYPE);
        putKeys.push(row.thumbnailKey);
      }
      saved = await this.insertRows(photos, apartmentId);
    } catch (e) {
      await this.deleteObjects(...putKeys);
      throw e;
    }

    const savedBySha = new Map(saved.map((photo) => [photo.sha256, photo]));
    const result = new Map<string, UploadedPhoto>();
    for (const { row } of photos) {
      const photo = savedBySha.get(row.sha256)!;
      // Not our row: a parallel upload stored the same file first. Our objects are unused.
      const lostRace = photo.id !== row.id;
      if (lostRace) await this.deleteObjects(row.storageKey, row.thumbnailKey);
      result.set(row.sha256, { photo, duplicate: lostRace });
    }
    return result;
  }

  // A file a parallel upload stored meanwhile is skipped by the insert (ON CONFLICT DO NOTHING), and the select
  // returns that upload's row instead of ours. If it is in another place → 409, the whole transaction rolls back.
  private insertRows(photos: NewPhoto[], apartmentId: string | null): Promise<Photo[]> {
    const rows = photos.map((p) => p.row);
    return this.prisma.$transaction(async (tx) => {
      await tx.photo.createMany({ data: rows, skipDuplicates: true });
      const saved = await tx.photo.findMany({
        where: { sha256: { in: rows.map((r) => r.sha256) } },
      });
      // Only if a parallel request deleted that row between our insert and select.
      if (saved.length !== rows.length) {
        throw new ConflictException('A photo changed during upload — try again');
      }
      saved.forEach((photo) => this.assertSamePlace(photo, apartmentId));
      return saved;
    });
  }

  private async deleteObjects(...keys: string[]): Promise<void> {
    const results = await Promise.allSettled(keys.map((key) => this.storage.delete(key)));
    results.forEach((r, i) => {
      if (r.status === 'rejected') this.logger.error(`Orphaned storage object: ${keys[i]}`);
    });
  }
}
