import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApartmentsService } from '../apartments/apartments.service.js';
import { parseDateOnly } from '../common/helpers/date-only.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantsService } from '../tenants/tenants.service.js';
import { CreateLeaseDto } from './dto/create-lease.dto.js';
import { LeaseTenantInputDto } from './dto/lease-tenant-input.dto.js';
import { UpdateLeaseDto } from './dto/update-lease.dto.js';
import { leaseWithTenantsInclude, type LeaseWithTenants } from './helpers/lease-with-tenants.js';

// Date overlap and endDate >= startDate are enforced by DB constraints (leases_no_overlap,
// leases_dates_check); PrismaExceptionFilter turns violations into 409/400. Not re-checked here.
@Injectable()
export class LeasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apartments: ApartmentsService,
    private readonly tenants: TenantsService,
  ) {}

  async listForApartment(apartmentId: string): Promise<LeaseWithTenants[]> {
    await this.apartments.findOrThrow(apartmentId);
    return this.prisma.lease.findMany({
      where: { apartmentId },
      include: leaseWithTenantsInclude,
      orderBy: { startDate: 'desc' },
    });
  }

  async findOrThrow(id: string): Promise<LeaseWithTenants> {
    const lease = await this.prisma.lease.findUnique({
      where: { id },
      include: leaseWithTenantsInclude,
    });
    if (!lease) throw new NotFoundException('Lease not found');
    return lease;
  }

  async create(apartmentId: string, dto: CreateLeaseDto): Promise<LeaseWithTenants> {
    await this.apartments.findActiveOrThrow(apartmentId);
    await this.tenants.assertAllExist(dto.tenants.map((t) => t.tenantId));
    // A nested create is a single Prisma transaction: lease + tenant links, or nothing.
    return this.prisma.lease.create({
      data: {
        apartmentId,
        startDate: parseDateOnly(dto.startDate),
        endDate: dto.endDate ? parseDateOnly(dto.endDate) : null,
        monthlyRent: dto.monthlyRent,
        notes: dto.notes,
        tenants: { create: dto.tenants.map((t) => ({ tenantId: t.tenantId, role: t.role })) },
      },
      include: leaseWithTenantsInclude,
    });
  }

  async update(id: string, dto: UpdateLeaseDto): Promise<LeaseWithTenants> {
    await this.findOrThrow(id);
    return this.prisma.lease.update({
      where: { id },
      data: {
        // undefined = leave unchanged; null = clear.
        startDate: dto.startDate ? parseDateOnly(dto.startDate) : undefined,
        endDate: dto.endDate === undefined ? undefined : dto.endDate && parseDateOnly(dto.endDate),
        monthlyRent: dto.monthlyRent,
        notes: dto.notes,
      },
      include: leaseWithTenantsInclude,
    });
  }

  async replaceTenants(id: string, tenants: LeaseTenantInputDto[]): Promise<LeaseWithTenants> {
    await this.findOrThrow(id);
    await this.tenants.assertAllExist(tenants.map((t) => t.tenantId));
    await this.prisma.$transaction([
      this.prisma.leaseTenant.deleteMany({ where: { leaseId: id } }),
      this.prisma.leaseTenant.createMany({
        data: tenants.map((t) => ({ leaseId: id, tenantId: t.tenantId, role: t.role })),
      }),
    ]);
    return this.findOrThrow(id);
  }

  // Only for open-ended leases; change an existing endDate via PATCH.
  async end(id: string, endDate: string): Promise<LeaseWithTenants> {
    const lease = await this.findOrThrow(id);
    if (lease.endDate) throw new ConflictException('Lease already ended');
    return this.prisma.lease.update({
      where: { id },
      data: { endDate: parseDateOnly(endDate) },
      include: leaseWithTenantsInclude,
    });
  }

  // TODO: forbid once statements reference leases (history must not disappear).
  async delete(id: string): Promise<void> {
    await this.findOrThrow(id);
    // lease_tenants rows go with it (onDelete: Cascade).
    await this.prisma.lease.delete({ where: { id } });
  }
}
