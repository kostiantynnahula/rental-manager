import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { parseDateOnly } from '../common/helpers/date-only.js';
import { ApartmentsService } from '../apartments/apartments.service.js';
import { currentLeaseWhere } from '../apartments/helpers/current-lease-where.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import type { ConditionPhoto, Prisma } from '../generated/prisma/client.js';
import { ConditionPhotoEvent, ConditionPhotoIndexStatus } from '../generated/prisma/enums.js';
import { prepareImages } from '../images/helpers/prepare-images.js';
import { THUMBNAIL_MIME_TYPE } from '../images/helpers/thumbnail.js';
import type { ImageFile } from '../images/interfaces/image-file.interface.js';
import type { PreparedImage } from '../images/interfaces/prepared-image.interface.js';
import { leaseWithTenantsInclude } from '../leases/helpers/lease-with-tenants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConditionPhotoJobsService } from '../queue/condition-photo-jobs.service.js';
import { StorageService } from '../storage/storage.service.js';
import { ConditionPhotoIndexService } from './condition-photo-index.service.js';
import { ListConditionPhotosQueryDto } from './dto/list-condition-photos-query.dto.js';
import { SearchConditionPhotosQueryDto } from './dto/search-condition-photos-query.dto.js';
import { SetConditionPhotoDescriptionDto } from './dto/set-condition-photo-description.dto.js';
import { UpdateConditionPhotoDto } from './dto/update-condition-photo.dto.js';
import { UploadConditionPhotosBodyDto } from './dto/upload-condition-photos-body.dto.js';
import { assertDateRange } from './helpers/assert-date-range.js';
import { assertSameApartment } from './helpers/assert-same-apartment.js';
import { conditionBaseline } from './helpers/condition-baseline.js';
import { jsonEquals, sameDescription, toDescriptionJson } from './helpers/description-json.js';
import { cleanNote } from './helpers/note.js';
import { newConditionPhotos, uploadAnswers } from './helpers/upload-batch.js';
import type { ConditionBaseline } from './interfaces/condition-baseline.interface.js';
import type { ConditionPhotoDescription } from './interfaces/condition-photo-description.interface.js';
import type { ConditionPhotoDetail } from './interfaces/condition-photo-detail.interface.js';
import type { ConditionPhotoSearchHit } from './interfaces/condition-photo-search-hit.interface.js';
import type { NewConditionPhoto } from './interfaces/new-condition-photo.interface.js';
import type { UploadedConditionPhoto } from './interfaces/uploaded-condition-photo.interface.js';

@Injectable()
export class ConditionPhotosService {
  private readonly logger = new Logger(ConditionPhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly apartments: ApartmentsService,
    private readonly jobs: ConditionPhotoJobsService,
    private readonly index: ConditionPhotoIndexService,
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
    assertDateRange(query);
    const takenOn: Prisma.DateTimeFilter = {
      ...(query.from && { gte: parseDateOnly(query.from) }),
      ...(query.to && { lte: parseDateOnly(query.to) }),
    };
    return this.prisma.conditionPhoto.findMany({
      where: { apartmentId, event: query.event, takenOn },
      orderBy: [{ takenOn: 'desc' }, { uploadedAt: 'desc' }, { id: 'desc' }],
    });
  }

  // By relevance (semantic search over the descriptions). The cheap checks first, then Voyage.
  async search(
    apartmentId: string,
    query: SearchConditionPhotosQueryDto,
  ): Promise<ConditionPhotoSearchHit[]> {
    await this.apartments.findOrThrow(apartmentId);
    assertDateRange(query);
    return this.index.search(apartmentId, query);
  }

  // The state on a date (the chat's get_condition_baseline): see conditionBaseline. An archived apartment's too.
  async baseline(apartmentId: string, date: Date): Promise<ConditionBaseline> {
    await this.apartments.findOrThrow(apartmentId);
    const photos = await this.prisma.conditionPhoto.findMany({
      where: {
        apartmentId,
        event: { in: [ConditionPhotoEvent.CHECK_IN, ConditionPhotoEvent.CHANGE] },
        takenOn: { lte: date },
      },
    });
    return conditionBaseline(photos, date);
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

  // The user's fields, and the description (#142). event/takenOn/note don't touch indexStatus: the searchable text is
  // built from the description only. `description`: an object replaces it as a whole (no item merge) and marks it
  // edited — the worker never overwrites it again (setDescription); null restores the worker's last one. Allowed in
  // any indexStatus (a FAILED photo can be described by hand). A changed description → DESCRIBED → re-embedded →
  // INDEXED; Voyage down → still 200, left DESCRIBED for embed:backfill (a human edit never fails on indexing).
  async update(id: string, dto: UpdateConditionPhotoDto): Promise<ConditionPhotoDetail> {
    const toIndex = await this.prisma.$transaction(async (tx) => {
      const photo = await tx.conditionPhoto.findUnique({
        where: { id },
        select: { description: true, descriptionEditedAt: true, generatedDescription: true },
      });
      if (!photo) throw new NotFoundException('Condition photo not found');
      // What the description becomes (undefined = left as is) and its descriptionEditedAt.
      let description: ConditionPhotoDescription | undefined;
      let editedAt: Date | null = null;
      if (dto.description) {
        description = dto.description;
        editedAt = new Date();
      } else if (dto.description === null && photo.descriptionEditedAt) {
        // Only ever written by the PUT from a validated DTO.
        const generated = photo.generatedDescription as unknown as ConditionPhotoDescription | null;
        if (!generated) throw new ConflictException('No generated description to restore');
        description = generated;
      }
      // null for a photo that isn't edited: already the worker's, nothing to restore.
      // The same content as now: no edit mark, no re-index — the photo stays searchable even if Voyage is down.
      // (Restoring the same content still clears the edit mark.)
      const unchanged =
        description !== undefined && sameDescription(description, photo.description);
      const data: Prisma.ConditionPhotoUpdateManyMutationInput = {
        event: dto.event,
        takenOn: dto.takenOn === undefined ? undefined : parseDateOnly(dto.takenOn),
        note: dto.note === undefined ? undefined : cleanNote(dto.note),
        ...(description &&
          !unchanged && {
            description: toDescriptionJson(description),
            descriptionEditedAt: editedAt,
            indexStatus: ConditionPhotoIndexStatus.DESCRIBED,
            indexNote: null,
          }),
        ...(dto.description === null && unchanged && { descriptionEditedAt: null }),
      };
      // Nothing to change → no write.
      if (Object.values(data).every((v) => v === undefined)) return undefined;
      // Only while the photo is as read: no row lock here, so a worker PUT that refreshed generatedDescription in
      // between (or another edit) would otherwise be overwritten by a stale restore.
      const { count } = await tx.conditionPhoto.updateMany({
        where: {
          id,
          descriptionEditedAt: photo.descriptionEditedAt,
          generatedDescription: jsonEquals(photo.generatedDescription),
        },
        data,
      });
      if (count === 0) throw new ConflictException('The photo changed meanwhile, try again');
      return unchanged ? undefined : description;
    });
    if (toIndex) await this.indexEdited(id, toIndex);
    return this.findDetailOrThrow(id);
  }

  // The worker's result (API keys only). Idempotent: a retry overwrites. A description always becomes
  // generatedDescription, but `description` only while a human hasn't edited it (#142: the edit wins — then status
  // and search stay as they are, no re-embed). An error never overwrites a usable description: a photo already
  // DESCRIBED/INDEXED stays so (e.g. the worker lost the answer to a successful PUT and then failed its retries) — a
  // no-op 204.
  async setDescription(
    id: string,
    dto: SetConditionPhotoDescriptionDto,
    user: AuthUser,
  ): Promise<void> {
    if (!user.apiKeyId) throw new ForbiddenException('Only API keys can set the description');
    if (dto.description !== undefined && dto.error !== undefined) {
      throw new BadRequestException('Send either description or error, not both');
    }
    if (dto.description) {
      const json = toDescriptionJson(dto.description);
      const { count } = await this.prisma.conditionPhoto.updateMany({
        where: { id, descriptionEditedAt: null },
        data: {
          indexStatus: ConditionPhotoIndexStatus.DESCRIBED,
          description: json,
          generatedDescription: json,
          indexNote: null,
        },
      });
      if (count === 0) {
        // Edited by a human (or unknown → 404): keep the model's output only.
        const kept = await this.prisma.conditionPhoto.updateMany({
          where: { id },
          data: { generatedDescription: json },
        });
        if (kept.count === 0) throw new NotFoundException('Condition photo not found');
        return;
      }
      // DESCRIBED → INDEXED. Saved first: if Voyage fails (5xx → the worker retries) the description isn't lost,
      // and the backfill can index it later. A human edit saved meanwhile wins: index() drops the stale vector.
      await this.index.index(id, dto.description);
      return;
    }
    const where: Prisma.ConditionPhotoWhereInput = {
      id,
      indexStatus: {
        notIn: [ConditionPhotoIndexStatus.DESCRIBED, ConditionPhotoIndexStatus.INDEXED],
      },
    };
    const { count } = await this.prisma.conditionPhoto.updateMany({
      where,
      data: { indexStatus: ConditionPhotoIndexStatus.FAILED, indexNote: dto.error },
    });
    // Nothing updated: unknown photo → 404; an error for a described one → skipped on purpose.
    if (count === 0) await this.findOrThrow(id);
  }

  // After a human edit: Voyage down (502) or not configured (503) leaves the photo DESCRIBED for embed:backfill —
  // the edit is saved, the PATCH still succeeds.
  private async indexEdited(id: string, description: ConditionPhotoDescription): Promise<void> {
    try {
      await this.index.index(id, description);
    } catch (e) {
      if (!(e instanceof BadGatewayException || e instanceof ServiceUnavailableException)) throw e;
      this.logger.warn(
        `Photo ${id}: edited description not embedded (${e.message}), left DESCRIBED`,
      );
    }
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
