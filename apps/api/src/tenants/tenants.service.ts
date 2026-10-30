import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Tenant } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { tenantWithLeasesInclude, type TenantWithLeases } from './helpers/tenant-with-leases.js';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  list(search?: string): Promise<Tenant[]> {
    const term = search?.trim();
    return this.prisma.tenant.findMany({
      where: term
        ? {
            OR: [
              { fullName: { contains: term, mode: 'insensitive' } },
              { phone: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {},
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

  create(dto: CreateTenantDto): Promise<Tenant> {
    return this.prisma.tenant.create({ data: dto });
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
