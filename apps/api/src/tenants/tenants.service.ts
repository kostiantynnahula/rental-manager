import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { phoneSearchDigits } from '@rental/shared';
import { parseDateOnly, todayDateOnly } from '../common/helpers/date-only.js';
import { Prisma, Tenant } from '../generated/prisma/client.js';
import {
  leaseWithTenantsInclude,
  type LeaseWithTenants,
} from '../leases/helpers/lease-with-tenants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddContactAssignmentDto } from './dto/add-contact-assignment.dto.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { NewLeaseAssignmentDto } from './dto/new-lease-assignment.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { tenantListInclude, type TenantWithLeaseDates } from './helpers/tenant-list-include.js';
import { isLeaseCurrent } from './helpers/tenant-status.js';
import { tenantWithLeasesInclude, type TenantWithLeases } from './helpers/tenant-with-leases.js';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // Phones are stored normalized (+380…), so a phone-like term is matched by its digits in any format.
  list(search?: string): Promise<TenantWithLeaseDates[]> {
    const term = search?.trim();
    let where: Prisma.TenantWhereInput = {};
    if (term) {
      const digits = phoneSearchDigits(term);
      where = {
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          ...(digits ? [{ phone: { contains: digits } }] : []),
        ],
      };
    }
    return this.prisma.tenant.findMany({
      where,
      include: tenantListInclude,
      orderBy: { fullName: 'asc' },
    });
  }

  async findWithLeasesOrThrow(id: string): Promise<TenantWithLeases> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: tenantWithLeasesInclude,
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  // Used by leases: a lease body referencing unknown tenants is a client error (400), not a 409
  // from the FK.
  async assertAllExist(ids: string[]): Promise<void> {
    const found = await this.prisma.tenant.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const known = new Set(found.map((t) => t.id));
    const missing = ids.filter((id) => !known.has(id));
    if (missing.length > 0)
      throw new BadRequestException(`Unknown tenant(s): ${missing.join(', ')}`);
  }

  // Tenant + optional assignment in one transaction: any failure (incl. the leases_no_overlap constraint → 409 via
  // PrismaExceptionFilter) rolls the tenant back too. Lease rules stay in the DB, so this doesn't go through
  // LeasesService (LeasesModule already imports TenantsModule).
  create(dto: CreateTenantDto): Promise<{ tenant: Tenant; lease: LeaseWithTenants | null }> {
    const { assignment, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data });
      if (!assignment) return { tenant, lease: null };
      const leaseId =
        assignment.mode === 'NEW_LEASE'
          ? await this.createLeaseFor(tx, tenant.id, assignment)
          : await this.addAsContact(tx, tenant.id, assignment);
      const lease = await tx.lease.findUniqueOrThrow({
        where: { id: leaseId },
        include: leaseWithTenantsInclude,
      });
      return { tenant, lease };
    });
  }

  private async createLeaseFor(
    tx: Prisma.TransactionClient,
    tenantId: string,
    assignment: NewLeaseAssignmentDto,
  ): Promise<string> {
    const apartment = await tx.apartment.findUnique({ where: { id: assignment.apartmentId } });
    if (!apartment) throw new BadRequestException('Unknown apartment');
    if (!apartment.isActive) throw new ConflictException('Apartment is archived');
    const lease = await tx.lease.create({
      data: {
        apartmentId: apartment.id,
        startDate: parseDateOnly(assignment.startDate),
        monthlyRent: assignment.monthlyRent,
        notes: assignment.notes,
        tenants: { create: [{ tenantId, role: 'PRIMARY' }] },
      },
      select: { id: true },
    });
    return lease.id;
  }

  private async addAsContact(
    tx: Prisma.TransactionClient,
    tenantId: string,
    assignment: AddContactAssignmentDto,
  ): Promise<string> {
    const lease = await tx.lease.findUnique({
      where: { id: assignment.leaseId },
      include: { apartment: { select: { isActive: true } } },
    });
    if (!lease) throw new BadRequestException('Unknown lease');
    if (!lease.apartment.isActive) throw new ConflictException('Apartment is archived');
    if (!isLeaseCurrent(lease, todayDateOnly()))
      throw new ConflictException('Lease is not current (ended or not started yet)');
    await tx.leaseTenant.create({ data: { leaseId: lease.id, tenantId, role: 'CONTACT' } });
    return lease.id;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    await this.findOrThrow(id);
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  // Only tenants without lease history; the RESTRICT FK is the backstop for a concurrent insert.
  async delete(id: string): Promise<void> {
    await this.findOrThrow(id);
    const leases = await this.prisma.leaseTenant.count({ where: { tenantId: id } });
    if (leases > 0) throw new ConflictException("Tenant has leases and can't be deleted");
    await this.prisma.tenant.delete({ where: { id } });
  }

  private async findOrThrow(id: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }
}
