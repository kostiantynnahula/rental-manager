import { historyValueWarnings } from './helpers/history-value-warnings.js';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApartmentsService } from '../apartments/apartments.service.js';
import { parseDateOnly, todayDateOnly } from '../common/helpers/date-only.js';
import { parsePeriod, periodEnd } from '../common/helpers/period.js';
import { Meter, Prisma } from '../generated/prisma/client.js';
import { ReadingKind, ReadingSource, ReadingStatus } from '../generated/prisma/enums.js';
import { MetersService } from '../meters/meters.service.js';
import { PhotosService } from '../photos/photos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReadingDto } from './dto/create-reading.dto.js';
import { ReadingDraftValueInputDto } from './dto/reading-draft-value-input.dto.js';
import { UpdateReadingDto } from './dto/update-reading.dto.js';
import type { ApartmentReadingHistoryQueryDto } from './dto/apartment-reading-history-query.dto.js';
import { checkConfirmRules } from './helpers/confirm-rules.js';
import { pickPeriodReading } from './helpers/period-reading.js';
import { consumptionByReading } from './helpers/consumption-by-reading.js';
import {
  confirmedConsumptionQuery,
  unconfirmedConsumptionQuery,
} from './helpers/reading-consumption-sql.js';
import { readingWithValuesInclude, type ReadingWithValues } from './helpers/reading-with-values.js';
import { READING_HISTORY_ORDER, readingHistoryWhere } from './helpers/reading-history-sql.js';
import { zonesInvalid } from './helpers/zones.js';
import type { ConfirmCandidate } from './interfaces/confirm-candidate.interface.js';
import type { ApartmentMeterReading } from './interfaces/apartment-meter-reading.interface.js';
import type { ReadingWithConsumption } from './interfaces/reading-with-consumption.interface.js';
import type { ReadingConsumptionRow } from './interfaces/reading-consumption-row.interface.js';
import type { ReadingHistoryPage } from './interfaces/reading-history-page.interface.js';
import type { ReadingHistoryRow } from './interfaces/reading-history-row.interface.js';
import type { ReadingHistoryValueRow } from './interfaces/reading-history-value-row.interface.js';

// REGULAR readings only; INITIAL/FINAL are written by MetersService (create/remove/replace).
// Business rules for confirming live in helpers/confirm-rules.ts (pure); this service loads the
// data, runs them inside a transaction and turns violations into 400/409.
@Injectable()
export class ReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meters: MetersService,
    private readonly apartments: ApartmentsService,
    private readonly photos: PhotosService,
  ) {}

  async listForMeter(
    meterId: string,
    query: { from?: string; to?: string; includeCancelled: boolean },
  ): Promise<ReadingWithConsumption[]> {
    await this.meters.findOrThrow(meterId);
    const from = query.from ? parsePeriod(query.from) : undefined;
    const to = query.to ? parsePeriod(query.to) : undefined;
    if (from && to && from > to) throw new BadRequestException('from must not be after to');

    const readings = await this.prisma.reading.findMany({
      where: {
        meterId,
        period: { gte: from, lte: to },
        ...(query.includeCancelled ? {} : { status: { not: ReadingStatus.CANCELLED } }),
      },
      include: readingWithValuesInclude,
      orderBy: [{ period: 'desc' }, { readingDate: 'desc' }, { createdAt: 'desc' }],
    });
    // The view sees the meter's full history, so the previous reading may be outside from..to.
    return this.withConsumption(readings);
  }

  // Every meter active during the period, with its reading for it — or MISSING.
  async listForApartment(
    apartmentId: string,
    periodValue: string,
  ): Promise<ApartmentMeterReading[]> {
    await this.apartments.findOrThrow(apartmentId);
    const period = parsePeriod(periodValue);
    const meters = await this.prisma.meter.findMany({
      where: {
        apartmentId,
        installedAt: { lte: periodEnd(period) },
        OR: [{ removedAt: null }, { removedAt: { gte: period } }],
      },
      include: {
        readings: {
          where: { period, status: { not: ReadingStatus.CANCELLED } },
          include: readingWithValuesInclude,
        },
      },
      orderBy: [{ utility: 'asc' }, { label: 'asc' }, { installedAt: 'asc' }],
    });
    const picked = meters.map(({ readings, ...meter }) => ({
      meter,
      ...pickPeriodReading(readings),
    }));
    const entries = await this.withConsumption(
      picked.flatMap(({ reading }) => (reading ? [reading] : [])),
    );
    return picked.map(({ meter, status, reading }) => ({
      meter,
      status,
      entry: entries.find((e) => e.reading.id === reading?.id) ?? null,
    }));
  }

  // Confirmed readings of the apartment, newest period first, one item per reading (values grouped).
  // Consumption comes from the reading_consumption view, which runs over each meter's full history,
  // so a period filter never drops the previous value of the first row.
  async historyForApartment(
    apartmentId: string,
    query: ApartmentReadingHistoryQueryDto,
  ): Promise<ReadingHistoryPage> {
    await this.apartments.findOrThrow(apartmentId);
    const from = query.from ? parsePeriod(query.from) : undefined;
    const to = query.to ? parsePeriod(query.to) : undefined;
    if (from && to && from > to) throw new BadRequestException('from must not be after to');

    const where = readingHistoryWhere({ apartmentId, from, to, meterIds: query.meterIds });
    const offset = (query.page - 1) * query.pageSize;
    const [rows, [{ total }], leases] = await Promise.all([
      this.prisma.$queryRaw<ReadingHistoryRow[]>`
        SELECT r."id", r."meterId", r."period", r."readingDate", r."kind",
               m."utility", m."label", m."serialNumber", m."removedAt"
        FROM "readings" r JOIN "meters" m ON m."id" = r."meterId"
        ${where}
        ${READING_HISTORY_ORDER}
        LIMIT ${query.pageSize} OFFSET ${offset}`,
      this.prisma.$queryRaw<[{ total: number }]>`
        SELECT COUNT(*)::int AS "total"
        FROM "readings" r JOIN "meters" m ON m."id" = r."meterId"
        ${where}`,
      this.prisma.lease.findMany({
        where: { apartmentId },
        select: { startDate: true, endDate: true },
      }),
    ]);

    const values =
      rows.length === 0
        ? []
        : await this.prisma.$queryRaw<ReadingHistoryValueRow[]>`
            SELECT rc."readingId", rc."zone", rc."value", rc."consumption", rc."previousPeriod",
                   v."photoId", v."source"
            FROM "reading_consumption" rc
            -- The join only adds the value's photo and source.
            JOIN "reading_values" v ON v."readingId" = rc."readingId" AND v."zone" = rc."zone"
            -- "meterId" is pushed down into the view (PARTITION BY column); readingId alone isn't.
            WHERE rc."meterId" = ANY(${[...new Set(rows.map((r) => r.meterId))]}::uuid[])
              AND rc."readingId" = ANY(${rows.map((r) => r.id)}::uuid[])
            ORDER BY rc."zone"`;

    return {
      items: rows.map((reading) => ({
        reading,
        values: values
          .filter((v) => v.readingId === reading.id)
          .map((v) => ({
            ...v,
            warnings: historyValueWarnings({
              utility: reading.utility,
              zone: v.zone,
              consumption: v.consumption,
              previousPeriod: v.previousPeriod,
              period: reading.period,
              leases,
            }),
          })),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOrThrow(id: string): Promise<ReadingWithConsumption> {
    const [entry] = await this.withConsumption([await this.getOrThrow(this.prisma, id)]);
    return entry;
  }

  // Humans only: API keys (the worker) add values through DraftValuesService (POST /meters/:id/draft-values).
  async create(
    meterId: string,
    dto: CreateReadingDto,
    userId: string,
  ): Promise<ReadingWithConsumption> {
    const meter = await this.meters.findOrThrow(meterId);
    await this.assertPhotos(dto.values, meter.apartmentId);
    const period = parsePeriod(dto.period);
    const readingDate = parseDateOnly(dto.readingDate);
    const values = { create: this.valueRows(dto.values) };
    const base = {
      meterId,
      kind: ReadingKind.REGULAR,
      period,
      readingDate,
      note: dto.note,
      createdById: userId,
    };

    if (!dto.confirm) {
      this.assertDraftAllowed(meter, dto.values);
      const created = await this.prisma.reading.create({ data: { ...base, values } });
      return this.findOrThrow(created.id);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await this.assertConfirmable(tx, meterId, { period, readingDate, values: dto.values });
      return tx.reading.create({
        data: { ...base, ...this.confirmation(userId), values },
      });
    });
    return this.findOrThrow(created.id);
  }

  async update(id: string, dto: UpdateReadingDto): Promise<ReadingWithConsumption> {
    await this.prisma.$transaction(async (tx) => {
      const reading = await this.getOrThrow(tx, id);
      if (reading.status !== ReadingStatus.DRAFT) {
        throw new ConflictException('Only DRAFT readings can be edited');
      }
      if (dto.values) {
        const meter = await this.meters.findOrThrow(reading.meterId, tx);
        this.assertDraftAllowed(meter, dto.values);
        await this.assertPhotos(dto.values, meter.apartmentId);
        await tx.readingValue.deleteMany({ where: { readingId: id } });
        await tx.readingValue.createMany({
          data: this.valueRows(dto.values).map((v) => ({ ...v, readingId: id })),
        });
      }
      await tx.reading.update({
        where: { id },
        data: {
          period: dto.period ? parsePeriod(dto.period) : undefined,
          readingDate: dto.readingDate ? parseDateOnly(dto.readingDate) : undefined,
          note: dto.note,
        },
      });
    });
    return this.findOrThrow(id);
  }

  async confirm(id: string, userId: string): Promise<ReadingWithConsumption> {
    await this.prisma.$transaction(async (tx) => {
      const reading = await this.getOrThrow(tx, id);
      if (reading.kind !== ReadingKind.REGULAR || reading.status !== ReadingStatus.DRAFT) {
        throw new ConflictException('Only DRAFT REGULAR readings can be confirmed');
      }
      await this.assertConfirmable(tx, reading.meterId, {
        id,
        period: reading.period,
        readingDate: reading.readingDate,
        values: reading.values.map((v) => ({ zone: v.zone, value: v.value.toFixed(3) })),
      });
      await tx.reading.update({ where: { id }, data: this.confirmation(userId) });
    });
    return this.findOrThrow(id);
  }

  async cancel(id: string, reason: string): Promise<ReadingWithConsumption> {
    const reading = await this.getOrThrow(this.prisma, id);
    if (reading.kind !== ReadingKind.REGULAR) {
      throw new ConflictException(
        'INITIAL and FINAL readings are managed via the meter endpoints (initial-values, remove)',
      );
    }
    if (reading.status === ReadingStatus.CANCELLED) {
      throw new ConflictException('Reading is already cancelled');
    }
    // Keep the original note; there are no cancelledAt/cancelledBy columns (yet).
    const line = `Cancelled: ${reason.trim()}`;
    await this.prisma.reading.update({
      where: { id },
      data: {
        status: ReadingStatus.CANCELLED,
        note: reading.note ? `${reading.note}\n${line}` : line,
      },
    });
    return this.findOrThrow(id);
  }

  async delete(id: string): Promise<void> {
    const reading = await this.getOrThrow(this.prisma, id);
    if (reading.status !== ReadingStatus.DRAFT) {
      throw new ConflictException('Only DRAFT readings can be deleted — cancel a confirmed one');
    }
    // Values cascade.
    await this.prisma.reading.delete({ where: { id } });
  }

  // Loads everything checkConfirmRules needs through `tx` and throws on the first violation
  // (409 if any violation is a conflict, otherwise 400 with all messages).
  private async assertConfirmable(
    tx: Prisma.TransactionClient,
    meterId: string,
    candidate: ConfirmCandidate,
  ): Promise<void> {
    const meter = await this.meters.findOrThrow(meterId, tx);
    const violations = checkConfirmRules({
      meter,
      candidate,
      confirmed: await this.confirmedReadings(tx, [meterId]),
      today: todayDateOnly(),
    });
    const conflict = violations.find((v) => v.conflict);
    if (conflict) throw new ConflictException(conflict.message);
    if (violations.length > 0) throw new BadRequestException(violations.map((v) => v.message));
  }

  // Drafts get light checks only: unknown or repeated zones would make the draft unusable, and a removed
  // meter takes no more readings. A draft may hold only some zones (filled zone by zone from separate
  // photos); the full zone match, dates and values are checked on confirm.
  private assertDraftAllowed(meter: Meter, values: ReadingDraftValueInputDto[]): void {
    if (meter.removedAt) throw new ConflictException('Meter is removed');
    const invalid = zonesInvalid(meter.zoneScheme, values);
    if (invalid) throw new BadRequestException(invalid);
  }

  // Every photo must show this apartment's meters (one photo can back several values).
  private async assertPhotos(
    values: ReadingDraftValueInputDto[],
    apartmentId: string,
  ): Promise<void> {
    const photoIds = [...new Set(values.flatMap((v) => v.photoId ?? []))];
    for (const photoId of photoIds) await this.photos.findForApartmentOrThrow(photoId, apartmentId);
  }

  private confirmation(userId: string) {
    return { status: ReadingStatus.CONFIRMED, confirmedAt: new Date(), confirmedById: userId };
  }

  private valueRows(values: ReadingDraftValueInputDto[]) {
    return values.map((v) => ({
      zone: v.zone,
      value: new Prisma.Decimal(v.value),
      photoId: v.photoId ?? null,
      source: v.photoId ? ReadingSource.PHOTO : ReadingSource.MANUAL,
    }));
  }

  // Consumption from the reading_consumption view: CONFIRMED readings read their own rows, others are
  // compared with the previous confirmed row (helpers/reading-consumption-sql.ts). One query per group.
  private async withConsumption(readings: ReadingWithValues[]): Promise<ReadingWithConsumption[]> {
    const confirmed = readings.filter((r) => r.status === ReadingStatus.CONFIRMED);
    const unconfirmed = readings.filter((r) => r.status !== ReadingStatus.CONFIRMED);
    const query = (group: ReadingWithValues[], build: typeof confirmedConsumptionQuery) =>
      group.length === 0
        ? Promise.resolve([])
        : this.prisma.$queryRaw<ReadingConsumptionRow[]>(
            build(
              [...new Set(group.map((r) => r.meterId))],
              group.map((r) => r.id),
            ),
          );
    const rows = (
      await Promise.all([
        query(confirmed, confirmedConsumptionQuery),
        query(unconfirmed, unconfirmedConsumptionQuery),
      ])
    ).flat();
    const byReading = consumptionByReading(rows);
    return readings.map((reading) => ({
      reading,
      consumption: byReading.get(reading.id) ?? null,
    }));
  }

  private confirmedReadings(
    db: Prisma.TransactionClient,
    meterIds: string[],
  ): Promise<ReadingWithValues[]> {
    return db.reading.findMany({
      where: { meterId: { in: meterIds }, status: ReadingStatus.CONFIRMED },
      include: readingWithValuesInclude,
    });
  }

  private async getOrThrow(db: Prisma.TransactionClient, id: string): Promise<ReadingWithValues> {
    const reading = await db.reading.findUnique({
      where: { id },
      include: readingWithValuesInclude,
    });
    if (!reading) throw new NotFoundException('Reading not found');
    return reading;
  }
}
