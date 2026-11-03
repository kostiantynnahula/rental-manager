import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApartmentsService } from '../apartments/apartments.service.js';
import { addMonths, parsePeriod } from '../common/helpers/period.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ApartmentTariffScope } from './constants/apartment-tariff-scopes.js';
import { CreateApartmentTariffDto } from './dto/create-apartment-tariff.dto.js';
import { OverrideApartmentTariffDto } from './dto/override-apartment-tariff.dto.js';
import { UpdateApartmentTariffDto } from './dto/update-apartment-tariff.dto.js';
import {
  apartmentTariffInclude,
  type ApartmentTariffWithTariff,
} from './helpers/apartment-tariff-include.js';
import { currentAttachmentWhere } from './helpers/current-attachment-where.js';
import { tariffPriceData } from './helpers/tariff-price-data.js';
import {
  disallowedZoneProblem,
  duplicatePriceProblem,
  totalCoverageProblem,
} from './helpers/tariff-rules.js';

// Tariffs attached to an apartment by month. Overlapping months of one tariff → 409 from the
// apartment_tariffs_no_overlap constraint; activeTo before activeFrom → 400 from apartment_tariffs_dates_check.
@Injectable()
export class ApartmentTariffsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apartments: ApartmentsService,
  ) {}

  async list(
    apartmentId: string,
    scope: ApartmentTariffScope,
    period: Date,
  ): Promise<ApartmentTariffWithTariff[]> {
    await this.apartments.findOrThrow(apartmentId);
    return this.prisma.apartmentTariff.findMany({
      where: { apartmentId, ...(scope === 'current' ? currentAttachmentWhere(period) : {}) },
      include: apartmentTariffInclude,
      orderBy: [{ tariff: { name: 'asc' } }, { activeFrom: 'desc' }, { id: 'asc' }],
    });
  }

  async create(
    apartmentId: string,
    dto: CreateApartmentTariffDto,
  ): Promise<ApartmentTariffWithTariff> {
    await this.apartments.findActiveOrThrow(apartmentId);
    const tariff = await this.prisma.tariff.findUnique({ where: { id: dto.tariffId } });
    // Unknown id in the body: a client error, not a 409 from the FK.
    if (!tariff) throw new BadRequestException('Unknown tariffId');
    if (!tariff.isActive) throw new ConflictException('Tariff is archived');
    return this.prisma.apartmentTariff.create({
      data: { apartmentId, tariffId: dto.tariffId, activeFrom: parsePeriod(dto.activeFrom) },
      include: apartmentTariffInclude,
    });
  }

  // End (last billed month) or reopen (null). Allowed for archived apartments and tariffs too.
  async update(
    apartmentId: string,
    id: string,
    dto: UpdateApartmentTariffDto,
  ): Promise<ApartmentTariffWithTariff> {
    await this.findOrThrow(apartmentId, id);
    return this.prisma.apartmentTariff.update({
      where: { id },
      data: { activeTo: dto.activeTo === null ? null : parsePeriod(dto.activeTo) },
      include: apartmentTariffInclude,
    });
  }

  // A mistaken attachment. TODO: forbid once a statement billed it (end it with activeTo instead).
  async delete(apartmentId: string, id: string): Promise<void> {
    await this.findOrThrow(apartmentId, id);
    await this.prisma.apartmentTariff.delete({ where: { id } });
  }

  // "Only for this apartment": the shared tariff stays as it is for past months (and for other apartments);
  // from month M the apartment is billed by its own copy. One transaction:
  // old attachment ends at M−1 (or is deleted if it starts in M — it never billed), copy attached from M.
  async override(
    apartmentId: string,
    id: string,
    dto: OverrideApartmentTariffDto,
  ): Promise<ApartmentTariffWithTariff> {
    await this.apartments.findActiveOrThrow(apartmentId);
    const attachment = await this.findOrThrow(apartmentId, id);
    const month = parsePeriod(dto.effectiveFrom);
    if (month < attachment.activeFrom || (attachment.activeTo && month > attachment.activeTo)) {
      throw new BadRequestException('effectiveFrom must be within the months of the attachment');
    }
    const source = attachment.tariff;
    const prices = dto.prices.map((p) =>
      tariffPriceData({ effectiveFrom: dto.effectiveFrom, zone: p.zone, price: p.price }),
    );
    const problem =
      disallowedZoneProblem(
        source.kind,
        source.utilities,
        prices.map((p) => p.zone),
      ) ??
      duplicatePriceProblem(prices) ??
      totalCoverageProblem(prices);
    if (problem) throw new BadRequestException(problem);

    return this.prisma.$transaction(async (tx) => {
      if (attachment.activeFrom < month) {
        await tx.apartmentTariff.update({
          where: { id },
          data: { activeTo: addMonths(month, -1) },
        });
      } else {
        await tx.apartmentTariff.delete({ where: { id } });
      }
      // Duplicate name → 409 (unique), and the whole transaction is rolled back.
      const copy = await tx.tariff.create({
        data: {
          name: dto.name,
          kind: source.kind,
          utilities: source.utilities,
          notes: source.notes,
          prices: { create: prices },
          apartments: {
            create: { apartmentId, activeFrom: month, activeTo: attachment.activeTo },
          },
        },
        include: { apartments: { select: { id: true } } },
      });
      return tx.apartmentTariff.findUniqueOrThrow({
        where: { id: copy.apartments[0].id },
        include: apartmentTariffInclude,
      });
    });
  }

  private async findOrThrow(apartmentId: string, id: string): Promise<ApartmentTariffWithTariff> {
    // Scoped by apartment: another apartment's attachment id is "not found" here.
    const attachment = await this.prisma.apartmentTariff.findFirst({
      where: { id, apartmentId },
      include: apartmentTariffInclude,
    });
    if (!attachment) throw new NotFoundException('Tariff attachment not found');
    return attachment;
  }
}
