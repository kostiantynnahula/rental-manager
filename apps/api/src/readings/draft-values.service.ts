import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { parseDateOnly } from '../common/helpers/date-only.js';
import { parsePeriod } from '../common/helpers/period.js';
import { Prisma } from '../generated/prisma/client.js';
import { ReadingKind, ReadingSource, ReadingStatus } from '../generated/prisma/enums.js';
import { MetersService } from '../meters/meters.service.js';
import { PhotosService } from '../photos/photos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDraftValueDto } from './dto/create-draft-value.dto.js';
import { draftValueAction } from './helpers/draft-value-action.js';
import { readingWithValuesInclude } from './helpers/reading-with-values.js';
import { zonesInvalid } from './helpers/zones.js';
import type { DraftValueResult } from './interfaces/draft-value-result.interface.js';
import { ReadingsService } from './readings.service.js';

// API keys (the worker) propose one zone's value per photo; the API decides which draft it goes into, so the
// worker never reads and rewrites drafts. The caller's open draft = DRAFT REGULAR of the meter and period created
// by the key's service user — a human's draft is never touched.
// No locking: two parallel calls for one meter + period could both create a draft. The worker processes one job at
// a time (concurrency 1), so they can't race; revisit (e.g. a partial unique index) if that changes.
@Injectable()
export class DraftValuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meters: MetersService,
    private readonly photos: PhotosService,
    private readonly readings: ReadingsService,
  ) {}

  async add(meterId: string, dto: CreateDraftValueDto, user: AuthUser): Promise<DraftValueResult> {
    if (!user.apiKeyId) throw new ForbiddenException('Only API keys can add draft values');
    const period = parsePeriod(dto.period);
    const value = {
      zone: dto.zone,
      value: new Prisma.Decimal(dto.value),
      photoId: dto.photoId,
      source: ReadingSource.PHOTO,
    };

    const { id, created } = await this.prisma.$transaction(async (tx) => {
      const meter = await this.meters.findOrThrow(meterId, tx);
      if (meter.removedAt) throw new ConflictException('Meter is removed');
      const invalid = zonesInvalid(meter.zoneScheme, [dto]);
      if (invalid) throw new BadRequestException(invalid);
      // An inbox photo gets the meter's apartment here (same transaction); another apartment → 409.
      await this.photos.claimForApartment(dto.photoId, meter.apartmentId, tx);

      const draft = await tx.reading.findFirst({
        where: {
          meterId,
          period,
          kind: ReadingKind.REGULAR,
          status: ReadingStatus.DRAFT,
          createdById: user.id,
        },
        include: readingWithValuesInclude,
        orderBy: { createdAt: 'desc' },
      });

      switch (draftValueAction(draft, dto.zone, dto.photoId)) {
        case 'create': {
          const reading = await tx.reading.create({
            data: {
              meterId,
              kind: ReadingKind.REGULAR,
              period,
              readingDate: parseDateOnly(dto.readingDate),
              note: dto.note,
              createdById: user.id,
              values: { create: [value] },
            },
          });
          return { id: reading.id, created: true };
        }
        case 'add':
          // The draft keeps its readingDate; a note is appended.
          await tx.reading.update({
            where: { id: draft!.id },
            data: {
              note: dto.note ? (draft!.note ? `${draft!.note}\n${dto.note}` : dto.note) : undefined,
              values: { create: [value] },
            },
          });
          return { id: draft!.id, created: false };
        case 'noop':
          return { id: draft!.id, created: false };
        case 'conflict':
          // readingId lets the worker tell this 409 from others (e.g. "Meter is removed").
          throw new ConflictException({
            statusCode: 409,
            error: 'Conflict',
            message: `${dto.zone} is already filled from another photo`,
            readingId: draft!.id,
          });
      }
    });
    return { entry: await this.readings.findOrThrow(id), created };
  }
}
