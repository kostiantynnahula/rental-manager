import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApartmentsService } from '../apartments/apartments.service.js';
import { formatDateOnly, parseDateOnly, todayDateOnly } from '../common/helpers/date-only.js';
import { periodOfDate } from '../common/helpers/period.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  ReadingKind,
  ReadingSource,
  ReadingStatus,
  ZoneScheme,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { meterFlags, NO_USAGE, type MeterUsage } from './helpers/meter-flags.js';
import type { MeterWithFlags } from './interfaces/meter-with-flags.interface.js';
import { ReadingValueInputDto } from '../readings/dto/reading-value-input.dto.js';
import { decreasedZones } from '../readings/helpers/decreased-values.js';
import {
  lastConfirmedReadingInclude,
  type MeterWithLastReading,
} from '../readings/helpers/last-confirmed-reading.js';
import { zonesMismatch } from '../readings/helpers/zones.js';
import { CreateMeterDto } from './dto/create-meter.dto.js';
import { RemoveMeterDto } from './dto/remove-meter.dto.js';
import { ReplaceMeterDto } from './dto/replace-meter.dto.js';
import { UpdateMeterDto } from './dto/update-meter.dto.js';
import type { NewMeterInput } from './interfaces/new-meter-input.interface.js';

// Meter lifecycle: create = meter + CONFIRMED INITIAL reading; fix initial = cancel + new INITIAL;
// remove = CONFIRMED FINAL reading + removedAt; replace = remove + create; delete = mistakes only.
// All readings written here are entered by the user, so they are MANUAL and confirmed right away.
@Injectable()
export class MetersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apartments: ApartmentsService,
  ) {}

  async listForApartment(
    apartmentId: string,
    includeRemoved: boolean,
  ): Promise<MeterWithLastReading[]> {
    await this.apartments.findOrThrow(apartmentId);
    return this.prisma.meter.findMany({
      where: { apartmentId, ...(includeRemoved ? {} : { removedAt: null }) },
      include: lastConfirmedReadingInclude,
      orderBy: [{ utility: 'asc' }, { label: 'asc' }, { installedAt: 'desc' }],
    });
  }

  // Adds canDelete / canEditInitialValues for responses: one grouped query for any number of meters.
  async withFlags(meters: MeterWithLastReading[]): Promise<MeterWithFlags[]> {
    if (meters.length === 0) return [];
    const rows = await this.prisma.reading.groupBy({
      by: ['meterId', 'kind', 'status'],
      where: {
        meterId: { in: meters.map((m) => m.id) },
        kind: { in: [ReadingKind.REGULAR, ReadingKind.FINAL] },
      },
      _count: { _all: true },
    });
    const usage = new Map<string, MeterUsage>();
    for (const row of rows) {
      const u = usage.get(row.meterId) ?? { ...NO_USAGE };
      u.regularOrFinal += row._count._all;
      if (row.kind === ReadingKind.REGULAR && row.status !== ReadingStatus.CANCELLED)
        u.activeRegular += row._count._all;
      usage.set(row.meterId, u);
    }
    return meters.map((m) => ({ ...m, ...meterFlags(m, usage.get(m.id) ?? NO_USAGE) }));
  }

  async withFlagsOne(meter: MeterWithLastReading): Promise<MeterWithFlags> {
    const [withFlags] = await this.withFlags([meter]);
    return withFlags;
  }

  async findOrThrow(id: string, db: Prisma.TransactionClient = this.prisma) {
    const meter = await db.meter.findUnique({
      where: { id },
      include: lastConfirmedReadingInclude,
    });
    if (!meter) throw new NotFoundException('Meter not found');
    return meter;
  }

  async create(apartmentId: string, dto: CreateMeterDto, userId: string) {
    await this.apartments.findActiveOrThrow(apartmentId);
    // A nested create is a single transaction: meter + INITIAL reading + values, or nothing.
    return this.createMeter(this.prisma, {
      apartmentId,
      utility: dto.utility,
      zoneScheme: dto.zoneScheme,
      label: dto.label,
      serialNumber: dto.serialNumber,
      installedAt: dto.installedAt,
      initialValues: dto.initialValues,
      userId,
    });
  }

  async update(id: string, dto: UpdateMeterDto): Promise<MeterWithLastReading> {
    await this.findOrThrow(id);
    return this.prisma.meter.update({
      where: { id },
      data: { label: dto.label, serialNumber: dto.serialNumber, notes: dto.notes },
      include: lastConfirmedReadingInclude,
    });
  }

  // Confirmed readings are immutable: the wrong INITIAL is cancelled and a corrected one created.
  async replaceInitialValues(
    id: string,
    values: ReadingValueInputDto[],
    userId: string,
  ): Promise<MeterWithLastReading> {
    return this.prisma.$transaction(async (tx) => {
      const meter = await this.findOrThrow(id, tx);
      if (meter.removedAt) throw new ConflictException('Meter is removed');
      const regular = await tx.reading.count({
        where: { meterId: id, kind: ReadingKind.REGULAR, status: { not: ReadingStatus.CANCELLED } },
      });
      if (regular > 0) {
        throw new ConflictException(
          "Initial values can't be changed once the meter has REGULAR readings",
        );
      }
      this.assertZones(meter.zoneScheme, values, 'initialValues');

      const initial = await tx.reading.findFirst({
        where: { meterId: id, kind: ReadingKind.INITIAL, status: ReadingStatus.CONFIRMED },
      });
      // Cancel first: at most one CONFIRMED INITIAL per meter (readings_one_confirmed_initial).
      if (initial) {
        await tx.reading.update({
          where: { id: initial.id },
          data: { status: ReadingStatus.CANCELLED },
        });
      }
      await tx.reading.create({
        data: {
          meterId: id,
          ...this.confirmedReading(
            ReadingKind.INITIAL,
            initial?.readingDate ?? meter.installedAt,
            values,
            userId,
          ),
        },
      });
      return this.findOrThrow(id, tx);
    });
  }

  remove(id: string, dto: RemoveMeterDto, userId: string): Promise<MeterWithLastReading> {
    return this.prisma.$transaction((tx) =>
      this.removeMeter(tx, id, dto.removedAt, dto.finalValues, userId),
    );
  }

  // Removes the old meter and installs a new one of the same utility on the same date.
  async replace(
    id: string,
    dto: ReplaceMeterDto,
    userId: string,
  ): Promise<{ removed: MeterWithLastReading; installed: MeterWithLastReading }> {
    return this.prisma.$transaction(async (tx) => {
      const old = await this.findOrThrow(id, tx);
      await this.apartments.findActiveOrThrow(old.apartmentId);
      const removed = await this.removeMeter(tx, id, dto.date, dto.finalValues, userId);
      const installed = await this.createMeter(tx, {
        apartmentId: old.apartmentId,
        utility: old.utility,
        zoneScheme: dto.newMeter.zoneScheme ?? old.zoneScheme,
        label: dto.newMeter.label,
        serialNumber: dto.newMeter.serialNumber,
        installedAt: dto.date,
        initialValues: dto.newMeter.initialValues,
        userId,
      });
      return { removed, installed };
    });
  }

  // For a meter added by mistake: only while it has nothing but INITIAL readings.
  async delete(id: string): Promise<void> {
    await this.findOrThrow(id);
    const used = await this.prisma.reading.count({
      where: { meterId: id, kind: { in: [ReadingKind.REGULAR, ReadingKind.FINAL] } },
    });
    if (used > 0) {
      throw new ConflictException("Meter has REGULAR or FINAL readings and can't be deleted");
    }
    await this.prisma.$transaction([
      // Only INITIAL readings are left (incl. cancelled corrections); their values cascade.
      this.prisma.reading.deleteMany({ where: { meterId: id } }),
      this.prisma.meter.delete({ where: { id } }),
    ]);
  }

  private async removeMeter(
    tx: Prisma.TransactionClient,
    id: string,
    removedAtValue: string,
    finalValues: ReadingValueInputDto[],
    userId: string,
  ): Promise<MeterWithLastReading> {
    const meter = await this.findOrThrow(id, tx);
    if (meter.removedAt) throw new ConflictException('Meter already removed');
    this.assertZones(meter.zoneScheme, finalValues, 'finalValues');
    const removedAt = this.notInFuture(removedAtValue, 'removedAt');

    const last = meter.readings[0];
    if (last && removedAt < last.readingDate) {
      throw new BadRequestException(
        `removedAt must not be before the last confirmed reading (${formatDateOnly(last.readingDate)})`,
      );
    }
    const decreased = decreasedZones(last?.values ?? [], finalValues);
    if (decreased.length > 0) {
      throw new BadRequestException(
        `finalValues must not be lower than the last confirmed values: ${decreased.join('; ')}`,
      );
    }
    return tx.meter.update({
      where: { id },
      data: {
        removedAt,
        readings: {
          create: this.confirmedReading(ReadingKind.FINAL, removedAt, finalValues, userId),
        },
      },
      include: lastConfirmedReadingInclude,
    });
  }

  private createMeter(
    db: Prisma.TransactionClient,
    input: NewMeterInput,
  ): Promise<MeterWithLastReading> {
    this.assertZones(input.zoneScheme, input.initialValues, 'initialValues');
    const installedAt = this.notInFuture(input.installedAt, 'installedAt');
    return db.meter.create({
      data: {
        apartmentId: input.apartmentId,
        utility: input.utility,
        zoneScheme: input.zoneScheme,
        label: input.label,
        serialNumber: input.serialNumber,
        installedAt,
        readings: {
          create: this.confirmedReading(
            ReadingKind.INITIAL,
            installedAt,
            input.initialValues,
            input.userId,
          ),
        },
      },
      include: lastConfirmedReadingInclude,
    });
  }

  // Data for a reading the user enters and confirms in the same step (INITIAL / FINAL).
  private confirmedReading(
    kind: ReadingKind,
    readingDate: Date,
    values: ReadingValueInputDto[],
    userId: string,
  ) {
    return {
      kind,
      period: periodOfDate(readingDate),
      readingDate,
      status: ReadingStatus.CONFIRMED,
      source: ReadingSource.MANUAL,
      createdById: userId,
      confirmedById: userId,
      confirmedAt: new Date(),
      values: { create: values.map((v) => ({ zone: v.zone, value: new Prisma.Decimal(v.value) })) },
    } satisfies Prisma.ReadingUncheckedCreateWithoutMeterInput;
  }

  private assertZones(scheme: ZoneScheme, values: ReadingValueInputDto[], field: string): void {
    const mismatch = zonesMismatch(scheme, values);
    if (mismatch) throw new BadRequestException(`${field}: ${mismatch}`);
  }

  // These dates become the reading's readingDate: a meter can't be read in the future.
  private notInFuture(value: string, field: string): Date {
    const date = parseDateOnly(value);
    if (date > todayDateOnly()) throw new BadRequestException(`${field} must not be in the future`);
    return date;
  }
}
