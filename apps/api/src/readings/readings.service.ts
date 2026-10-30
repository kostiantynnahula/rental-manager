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
import { ReadingValueInputDto } from './dto/reading-value-input.dto.js';
import { UpdateReadingDto } from './dto/update-reading.dto.js';
import { checkConfirmRules } from './helpers/confirm-rules.js';
import { pickPeriodReading } from './helpers/period-reading.js';
import { consumption, findPreviousConfirmed } from './helpers/reading-order.js';
import { readingWithValuesInclude, type ReadingWithValues } from './helpers/reading-with-values.js';
import { zonesMismatch } from './helpers/zones.js';
import type { ConfirmCandidate } from './interfaces/confirm-candidate.interface.js';
import type { ApartmentMeterReading } from './interfaces/apartment-meter-reading.interface.js';
import type { ReadingWithConsumption } from './interfaces/reading-with-consumption.interface.js';

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

    const [readings, confirmed] = await Promise.all([
      this.prisma.reading.findMany({
        where: {
          meterId,
          period: { gte: from, lte: to },
          ...(query.includeCancelled ? {} : { status: { not: ReadingStatus.CANCELLED } }),
        },
        include: readingWithValuesInclude,
        orderBy: [{ period: 'desc' }, { readingDate: 'desc' }, { createdAt: 'desc' }],
      }),
      // Consumption is relative to the previous confirmed reading, which may be outside from..to.
      this.confirmedReadings(this.prisma, [meterId]),
    ]);
    return readings.map((r) => this.withConsumption(r, confirmed));
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
    const confirmed = await this.confirmedReadings(
      this.prisma,
      meters.map((m) => m.id),
    );
    return meters.map(({ readings, ...meter }) => {
      const { status, reading } = pickPeriodReading(readings);
      return {
        meter,
        status,
        entry: reading ? this.withConsumption(reading, confirmed) : null,
      };
    });
  }

  async findOrThrow(id: string): Promise<ReadingWithConsumption> {
    const reading = await this.getOrThrow(this.prisma, id);
    const confirmed = await this.confirmedReadings(this.prisma, [reading.meterId]);
    return this.withConsumption(reading, confirmed);
  }

  async create(
    meterId: string,
    dto: CreateReadingDto,
    userId: string,
  ): Promise<ReadingWithConsumption> {
    const meter = await this.meters.findOrThrow(meterId);
    // The photo must show this apartment's meters (one photo can back several readings).
    if (dto.photoId) await this.photos.findForApartmentOrThrow(dto.photoId, meter.apartmentId);
    const period = parsePeriod(dto.period);
    const readingDate = parseDateOnly(dto.readingDate);
    const values = { create: this.valueRows(dto.values) };
    const base = {
      meterId,
      kind: ReadingKind.REGULAR,
      source: dto.photoId ? ReadingSource.PHOTO : ReadingSource.MANUAL,
      photoId: dto.photoId,
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
        this.assertDraftAllowed(await this.meters.findOrThrow(reading.meterId, tx), dto.values);
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

  // Drafts get light checks only: wrong zones would make the draft unusable, and a removed meter
  // takes no more readings. Dates and values are checked on confirm.
  private assertDraftAllowed(meter: Meter, values: ReadingValueInputDto[]): void {
    if (meter.removedAt) throw new ConflictException('Meter is removed');
    const mismatch = zonesMismatch(meter.zoneScheme, values);
    if (mismatch) throw new BadRequestException(mismatch);
  }

  private confirmation(userId: string) {
    return { status: ReadingStatus.CONFIRMED, confirmedAt: new Date(), confirmedById: userId };
  }

  private valueRows(values: ReadingValueInputDto[]) {
    return values.map((v) => ({ zone: v.zone, value: new Prisma.Decimal(v.value) }));
  }

  private withConsumption(
    reading: ReadingWithValues,
    confirmed: ReadingWithValues[],
  ): ReadingWithConsumption {
    const sameMeter = confirmed.filter((c) => c.meterId === reading.meterId);
    return {
      reading,
      consumption: consumption(findPreviousConfirmed(sameMeter, reading), reading.values),
    };
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
