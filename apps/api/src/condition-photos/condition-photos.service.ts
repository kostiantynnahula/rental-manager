import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseDateOnly } from '../common/helpers/date-only.js';
import { ApartmentsService } from '../apartments/apartments.service.js';
import { currentLeaseWhere } from '../apartments/helpers/current-lease-where.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import type { ConditionPhoto, Prisma } from '../generated/prisma/client.js';
import { ConditionPhotoIndexStatus } from '../generated/prisma/enums.js';
import { prepareImages } from '../images/helpers/prepare-images.js';
import { THUMBNAIL_MIME_TYPE } from '../images/helpers/thumbnail.js';
import type { ImageFile } from '../images/interfaces/image-file.interface.js';
import type { PreparedImage } from '../images/interfaces/prepared-image.interface.js';
import { leaseWithTenantsInclude } from '../leases/helpers/lease-with-tenants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConditionPhotoJobsService } from '../queue/condition-photo-jobs.service.js';
import { StorageService } from '../storage/storage.service.js';
import { ListConditionPhotosQueryDto } from './dto/list-condition-photos-query.dto.js';
import { SetConditionPhotoDescriptionDto } from './dto/set-condition-photo-description.dto.js';
import { UpdateConditionPhotoDto } from './dto/update-condition-photo.dto.js';
import { UploadConditionPhotosBodyDto } from './dto/upload-condition-photos-body.dto.js';
import { assertSameApartment } from './helpers/assert-same-apartment.js';
import { cleanNote } from './helpers/note.js';
import { newConditionPhotos, uploadAnswers } from './helpers/upload-batch.js';
import type { ConditionPhotoDetail } from './interfaces/condition-photo-detail.interface.js';
import type { NewConditionPhoto } from './interfaces/new-condition-photo.interface.js';
import type { UploadedConditionPhoto } from './interfaces/uploaded-condition-photo.interface.js';

@Injectable()
export class ConditionPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly apartments: ApartmentsService,
    private readonly jobs: ConditionPhotoJobsService,
  ) {}

  // One event/takenOn/note for the whole request. All or nothing, as meter photos: every file is validated first,
  // then the objects, then all rows in one transaction.
  async upload(
    apartmentId: string,
    files: Express.Multer.File[] | undefined,
    body: UploadConditionPhotosBodyDto,
  ): Promise<UploadedConditionPhoto[]> {
    const apartment = await this.apartments.findOrThrow(apartmentId);
    // 404, not 400 (unlike meter photos): an archived apartment takes no new condition photos.
    if (!apartment.isActive) throw new NotFoundException('Apartment is archived');
    if (!files?.length) throw new BadRequestException('No files: send them in the "files" field');

    const prepared: PreparedImage<ConditionPhoto>[] = await prepareImages(files, (sha256) =>
      this.findDuplicate(sha256, apartmentId),
    );
    const stored = await this.storeAll(
      newConditionPhotos(prepared, apartmentId, {
        event: body.event,
        takenOn: parseDateOnly(body.takenOn),
        note: cleanNote(body.note),
      }),
      apartmentId,
    );
    // Jobs only after the commit, so none points at a rolled-back photo. A duplicate (or a lost race) has its job.
    // In parallel: with Redis down each add waits for its timeout, and a 40-photo check-in must not wait 40 times.
    await Promise.all(
      [...stored.values()]
        .filter(({ duplicate }) => !duplicate)
        .map(({ photo }) => this.jobs.enqueueDescribe(photo.id)),
    );
    return uploadAnswers(prepared, stored);
  }

  // Sorted by takenOn (newest first), then by upload. An archived apartment's history is still listed.
  async list(apartmentId: string, query: ListConditionPhotosQueryDto): Promise<ConditionPhoto[]> {
    await this.apartments.findOrThrow(apartmentId);
    // YYYY-MM-DD strings compare as dates.
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('from must not be after to');
    }
    const takenOn: Prisma.DateTimeFilter = {
      ...(query.from && { gte: parseDateOnly(query.from) }),
      ...(query.to && { lte: parseDateOnly(query.to) }),
    };
    return this.prisma.conditionPhoto.findMany({
      where: { apartmentId, event: query.event, takenOn },
      orderBy: [{ takenOn: 'desc' }, { uploadedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findOrThrow(id: string): Promise<ConditionPhoto> {
    const photo = await this.prisma.conditionPhoto.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Condition photo not found');
    return photo;
  }

  // The lease is derived (the one covering takenOn — leases never overlap), never validated: a CHECK_IN photo the day
  // before the lease starts is fine and just has no lease.
  async findDetailOrThrow(id: string): Promise<ConditionPhotoDetail> {
    const photo = await this.findOrThrow(id);
    const lease = await this.prisma.lease.findFirst({
      where: { apartmentId: photo.apartmentId, ...currentLeaseWhere(photo.takenOn) },
      include: leaseWithTenantsInclude,
    });
    return { photo, lease };
  }

  // Only the user's fields. The index status stays: the searchable text is built from the description.
  async update(id: string, dto: UpdateConditionPhotoDto): Promise<ConditionPhotoDetail> {
    // Nothing to change: updateMany with an empty `data` writes nothing, so its count can't tell us the row exists.
    if (dto.event === undefined && dto.takenOn === undefined && dto.note === undefined) {
      return this.findDetailOrThrow(id);
    }
    const { count } = await this.prisma.conditionPhoto.updateMany({
      where: { id },
      data: {
        event: dto.event,
        takenOn: dto.takenOn === undefined ? undefined : parseDateOnly(dto.takenOn),
        note: dto.note === undefined ? undefined : cleanNote(dto.note),
      },
    });
    if (count === 0) throw new NotFoundException('Condition photo not found');
    return this.findDetailOrThrow(id);
  }

  // The worker's result (API keys only). Idempotent: a retry overwrites. An error never overwrites a usable
  // description: a photo already DESCRIBED/INDEXED stays so (e.g. the worker lost the answer to a successful PUT and
  // then failed its retries) — a no-op 204.
  async setDescription(
    id: string,
    dto: SetConditionPhotoDescriptionDto,
    user: AuthUser,
  ): Promise<void> {
    if (!user.apiKeyId) throw new ForbiddenException('Only API keys can set the description');
    if (dto.description !== undefined && dto.error !== undefined) {
      throw new BadRequestException('Send either description or error, not both');
    }
    const data: Prisma.ConditionPhotoUpdateManyMutationInput = dto.description
      ? {
          indexStatus: ConditionPhotoIndexStatus.DESCRIBED,
          // A plain object (class instances → JSON) for the Json column.
          description: JSON.parse(JSON.stringify(dto.description)) as Prisma.InputJsonObject,
          indexNote: null,
        }
      : { indexStatus: ConditionPhotoIndexStatus.FAILED, indexNote: dto.error };
    const where: Prisma.ConditionPhotoWhereInput = dto.description
      ? { id }
      : {
          id,
          indexStatus: {
            notIn: [ConditionPhotoIndexStatus.DESCRIBED, ConditionPhotoIndexStatus.INDEXED],
          },
        };
    const { count } = await this.prisma.conditionPhoto.updateMany({ where, data });
    // Nothing updated: unknown photo → 404; an error for a described one → skipped on purpose.
    if (count === 0) await this.findOrThrow(id);
  }

  async openFile(id: string, variant: 'original' | 'thumbnail'): Promise<ImageFile> {
    const photo = await this.findOrThrow(id);
    const isOriginal = variant === 'original';
    const object = await this.storage.getStream(isOriginal ? photo.storageKey : photo.thumbnailKey);
    return { ...object, mimeType: isOriginal ? photo.mimeType : THUMBNAIL_MIME_TYPE };
  }

  // Always allowed. Row first, objects second: a failure leaves an orphan object, never a dangling row.
  async delete(id: string): Promise<void> {
    const photo = await this.prisma.$transaction(async (tx) => {
      const found = await tx.conditionPhoto.findUnique({ where: { id } });
      if (!found) throw new NotFoundException('Condition photo not found');
      await tx.conditionPhoto.delete({ where: { id } });
      return found;
    });
    await this.storage.deleteAll(photo.storageKey, photo.thumbnailKey);
  }

  // Same apartment → the existing record (a duplicate). Another apartment → 409.
  private async findDuplicate(sha256: string, apartmentId: string): Promise<ConditionPhoto | null> {
    const existing = await this.prisma.conditionPhoto.findUnique({ where: { sha256 } });
    if (existing) assertSameApartment(existing, apartmentId);
    return existing;
  }

  // The objects, then every row in one transaction. Any failure → the objects are deleted, no row. Result by sha256.
  private async storeAll(
    photos: NewConditionPhoto[],
    apartmentId: string,
  ): Promise<Map<string, UploadedConditionPhoto>> {
    // The original is stored byte-for-byte; only the thumbnail is derived.
    await this.storage.putAll(
      photos.flatMap(({ item, row }) => [
        { key: row.storageKey, body: item.file.buffer, contentType: item.type.mime },
        { key: row.thumbnailKey, body: item.thumbnail.buffer, contentType: THUMBNAIL_MIME_TYPE },
      ]),
    );
    let saved: ConditionPhoto[];
    try {
      saved = await this.insertRows(photos, apartmentId);
    } catch (e) {
      await this.storage.deleteAll(
        ...photos.flatMap(({ row }) => [row.storageKey, row.thumbnailKey]),
      );
      throw e;
    }

    const savedBySha = new Map(saved.map((photo) => [photo.sha256, photo]));
    const result = new Map<string, UploadedConditionPhoto>();
    for (const { row } of photos) {
      const photo = savedBySha.get(row.sha256)!;
      // Not our row: a parallel upload stored the same file first. Our objects are unused.
      const lostRace = photo.id !== row.id;
      if (lostRace) await this.storage.deleteAll(row.storageKey, row.thumbnailKey);
      result.set(row.sha256, { photo, duplicate: lostRace });
    }
    return result;
  }

  // A file a parallel upload stored meanwhile is skipped by the insert (ON CONFLICT DO NOTHING), and the select
  // returns that upload's row instead of ours. If it is of another apartment → 409, the whole transaction rolls back.
  private insertRows(photos: NewConditionPhoto[], apartmentId: string): Promise<ConditionPhoto[]> {
    const rows = photos.map((p) => p.row);
    return this.prisma.$transaction(async (tx) => {
      await tx.conditionPhoto.createMany({ data: rows, skipDuplicates: true });
      const saved = await tx.conditionPhoto.findMany({
        where: { sha256: { in: rows.map((r) => r.sha256) } },
      });
      // Only if a parallel request deleted that row between our insert and select.
      if (saved.length !== rows.length) {
        throw new ConflictException('A photo changed during upload — try again');
      }
      saved.forEach((photo) => assertSameApartment(photo, apartmentId));
      return saved;
    });
  }
}
