import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { todayDateOnly } from '../common/helpers/date-only.js';
import { parsePeriod, periodOfDate } from '../common/helpers/period.js';
import { Prisma, type TariffPrice } from '../generated/prisma/client.js';
import { TariffKind } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTariffDto } from './dto/create-tariff.dto.js';
import { ListTariffsQueryDto } from './dto/list-tariffs-query.dto.js';
import { TariffPriceInputDto } from './dto/tariff-price-input.dto.js';
import { UpdateTariffPriceDto } from './dto/update-tariff-price.dto.js';
import { UpdateTariffDto } from './dto/update-tariff.dto.js';
import { tariffPriceData } from './helpers/tariff-price-data.js';
import {
  disallowedZoneProblem,
  duplicatePriceProblem,
  manualPricesProblem,
  totalCoverageProblem,
  utilitiesProblem,
} from './helpers/tariff-rules.js';
import { tariffWithPricesInclude, type TariffWithPrices } from './helpers/tariff-with-prices.js';
import type { TariffPage } from './interfaces/tariff-page.interface.js';

@Injectable()
export class TariffsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTariffsQueryDto): Promise<TariffPage> {
    const term = query.search?.trim();
    const where: Prisma.TariffWhereInput = {
      ...(term ? { name: { contains: term, mode: 'insensitive' } } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.utility ? { utilities: { has: query.utility } } : {}),
      ...(query.active === 'all' ? {} : { isActive: query.active === 'true' }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tariff.findMany({
        where,
        include: tariffWithPricesInclude,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.tariff.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findWithPricesOrThrow(id: string): Promise<TariffWithPrices> {
    const tariff = await this.prisma.tariff.findUnique({
      where: { id },
      include: tariffWithPricesInclude,
    });
    if (!tariff) throw new NotFoundException('Tariff not found');
    return tariff;
  }

  // Tariff + initial prices + attachments in one nested create (atomic). Attachments start with the earliest
  // price month, so an attached tariff always has a price; a MANUAL tariff (no prices) from the current month.
  async create(dto: CreateTariffDto): Promise<TariffWithPrices> {
    const utilities = dto.utilities ?? [];
    const prices = dto.prices.map((p) => tariffPriceData(p));
    const manual = dto.kind === TariffKind.MANUAL;
    const problem =
      utilitiesProblem(dto.kind, utilities) ??
      (manual
        ? manualPricesProblem(dto.kind, prices.length)
        : (disallowedZoneProblem(
            dto.kind,
            utilities,
            prices.map((p) => p.zone),
          ) ??
          duplicatePriceProblem(prices) ??
          totalCoverageProblem(prices)));
    if (problem) throw new BadRequestException(problem);
    const apartmentIds = dto.apartmentIds ?? [];
    await this.assertActiveApartments(apartmentIds);
    const activeFrom = manual
      ? periodOfDate(todayDateOnly())
      : new Date(Math.min(...prices.map((p) => p.effectiveFrom.getTime())));
    return this.prisma.tariff.create({
      data: {
        name: dto.name,
        kind: dto.kind,
        utilities,
        notes: dto.notes,
        prices: { create: prices },
        apartments: { create: apartmentIds.map((apartmentId) => ({ apartmentId, activeFrom })) },
      },
      include: tariffWithPricesInclude,
    });
  }

  async update(id: string, dto: UpdateTariffDto): Promise<TariffWithPrices> {
    const tariff = await this.findWithPricesOrThrow(id);
    const kind = dto.kind ?? tariff.kind;
    const utilities = dto.utilities ?? tariff.utilities;
    const changesBilling =
      kind !== tariff.kind ||
      utilities.length !== tariff.utilities.length ||
      utilities.some((u) => !tariff.utilities.includes(u));
    // MANUAL has no prices and the others need them: a kind change across it would leave the tariff invalid.
    if ((kind === TariffKind.MANUAL) !== (tariff.kind === TariffKind.MANUAL)) {
      throw new BadRequestException(
        "A tariff can't change to or from MANUAL — create a new tariff instead",
      );
    }
    if (changesBilling) {
      // Statements will bill attached tariffs by kind/utilities: changing them would rewrite history.
      if (tariff.apartments.length > 0) {
        throw new ConflictException(
          'Tariff is attached to apartments — archive it and create a new one to change kind or utilities',
        );
      }
      const problem =
        utilitiesProblem(kind, utilities) ??
        disallowedZoneProblem(
          kind,
          utilities,
          tariff.prices.map((p) => p.zone),
        );
      if (problem) throw new BadRequestException(problem);
    }
    return this.prisma.tariff.update({
      where: { id },
      data: { name: dto.name, notes: dto.notes, kind, utilities },
      include: tariffWithPricesInclude,
    });
  }

  async setActive(id: string, isActive: boolean): Promise<TariffWithPrices> {
    await this.findWithPricesOrThrow(id);
    return this.prisma.tariff.update({
      where: { id },
      data: { isActive },
      include: tariffWithPricesInclude,
    });
  }

  // Only a mistaken tariff: once attached to an apartment it is archived instead.
  async delete(id: string): Promise<void> {
    const tariff = await this.findWithPricesOrThrow(id);
    if (tariff.apartments.length > 0) {
      throw new ConflictException('Tariff is attached to apartments — archive it instead');
    }
    // tariff_prices rows go with it (onDelete: Cascade).
    await this.prisma.tariff.delete({ where: { id } });
  }

  // A price change = a new row from its month on; older rows stay for past months.
  async addPrice(id: string, dto: TariffPriceInputDto): Promise<TariffPrice> {
    const tariff = await this.findActiveOrThrow(id);
    const data = tariffPriceData(dto);
    const problem =
      manualPricesProblem(tariff.kind, 1) ??
      disallowedZoneProblem(tariff.kind, tariff.utilities, [data.zone]) ??
      totalCoverageProblem([...tariff.prices, data]);
    if (problem) throw new BadRequestException(problem);
    // Same month + zone → 409 from the unique index.
    return this.prisma.tariffPrice.create({ data: { ...data, tariffId: id } });
  }

  // Fixes a mistyped row. TODO: forbid once a statement uses this price.
  async updatePrice(id: string, priceId: string, dto: UpdateTariffPriceDto): Promise<TariffPrice> {
    const tariff = await this.findActiveOrThrow(id);
    // A MANUAL tariff has no rows, so this is a 404 for it.
    const current = this.findPriceOrThrow(tariff, priceId);
    const next = {
      effectiveFrom: dto.effectiveFrom ? parsePeriod(dto.effectiveFrom) : current.effectiveFrom,
      zone: dto.zone ?? current.zone,
    };
    const zoneProblem = disallowedZoneProblem(tariff.kind, tariff.utilities, [next.zone]);
    if (zoneProblem) throw new BadRequestException(zoneProblem);
    const coverage = totalCoverageProblem(tariff.prices.map((p) => (p.id === priceId ? next : p)));
    if (coverage) throw new ConflictException(coverage);
    return this.prisma.tariffPrice.update({
      where: { id: priceId },
      data: { ...next, price: dto.price },
    });
  }

  // Removes a mistaken row. TODO: forbid once a statement uses this price.
  async deletePrice(id: string, priceId: string): Promise<void> {
    const tariff = await this.findWithPricesOrThrow(id);
    this.findPriceOrThrow(tariff, priceId);
    const coverage = totalCoverageProblem(tariff.prices.filter((p) => p.id !== priceId));
    if (coverage) throw new ConflictException(coverage);
    await this.prisma.tariffPrice.delete({ where: { id: priceId } });
  }

  // Unknown ids are a client error (400, not a 409 from the FK); archived apartments get no new tariffs.
  private async assertActiveApartments(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const found = await this.prisma.apartment.findMany({
      where: { id: { in: ids } },
      select: { id: true, isActive: true },
    });
    if (found.length !== ids.length) throw new BadRequestException('Unknown apartmentIds');
    if (found.some((a) => !a.isActive)) throw new ConflictException('Apartment is archived');
  }

  private async findActiveOrThrow(id: string): Promise<TariffWithPrices> {
    const tariff = await this.findWithPricesOrThrow(id);
    if (!tariff.isActive) throw new ConflictException('Tariff is archived');
    return tariff;
  }

  private findPriceOrThrow(tariff: TariffWithPrices, priceId: string): TariffPrice {
    const price = tariff.prices.find((p) => p.id === priceId);
    if (!price) throw new NotFoundException('Price not found');
    return price;
  }
}
