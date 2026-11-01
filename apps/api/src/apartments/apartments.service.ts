import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { todayDateOnly } from '../common/helpers/date-only.js';
import { Apartment } from '../generated/prisma/client.js';
import {
  leaseWithTenantsInclude,
  type LeaseWithTenants,
} from '../leases/helpers/lease-with-tenants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateApartmentDto } from './dto/create-apartment.dto.js';
import type { ApartmentActiveFilter } from './dto/list-apartments-query.dto.js';
import { UpdateApartmentDto } from './dto/update-apartment.dto.js';
import { currentLeaseWhere } from './helpers/current-lease-where.js';
import type { ApartmentWithCurrentLease } from './interfaces/apartment-with-current-lease.interface.js';

@Injectable()
export class ApartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Each apartment with its current lease (0 or 1 element in `leases`) — one query for the list view.
  list(active: ApartmentActiveFilter): Promise<ApartmentWithCurrentLease[]> {
    return this.prisma.apartment.findMany({
      where: active === 'all' ? {} : { isActive: active === 'true' },
      orderBy: { name: 'asc' },
      include: {
        leases: {
          where: currentLeaseWhere(todayDateOnly()),
          take: 1,
          include: leaseWithTenantsInclude,
        },
      },
    });
  }

  async findOrThrow(id: string): Promise<Apartment> {
    const apartment = await this.prisma.apartment.findUnique({ where: { id } });
    if (!apartment) throw new NotFoundException('Apartment not found');
    return apartment;
  }

  // Used by leases: new leases can't be created for an archived apartment.
  async findActiveOrThrow(id: string): Promise<Apartment> {
    const apartment = await this.findOrThrow(id);
    if (!apartment.isActive) throw new ConflictException('Apartment is archived');
    return apartment;
  }

  async findWithCurrentLease(
    id: string,
  ): Promise<{ apartment: Apartment; currentLease: LeaseWithTenants | null }> {
    const apartment = await this.findOrThrow(id);
    const currentLease = await this.prisma.lease.findFirst({
      where: { apartmentId: id, ...currentLeaseWhere(todayDateOnly()) },
      include: leaseWithTenantsInclude,
    });
    return { apartment, currentLease };
  }

  create(dto: CreateApartmentDto): Promise<Apartment> {
    return this.prisma.apartment.create({ data: dto });
  }

  async update(id: string, dto: UpdateApartmentDto): Promise<Apartment> {
    await this.findOrThrow(id);
    return this.prisma.apartment.update({ where: { id }, data: dto });
  }

  // Idempotent: archiving an archived apartment just returns it.
  async setActive(id: string, isActive: boolean): Promise<Apartment> {
    await this.findOrThrow(id);
    return this.prisma.apartment.update({ where: { id }, data: { isActive } });
  }
}
