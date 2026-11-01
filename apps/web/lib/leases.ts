import type { components } from '@/lib/api/schema';

export type Lease = components['schemas']['LeaseResponseDto'];
export type LeaseTenant = components['schemas']['LeaseTenantResponseDto'];

export function primaryTenant(lease: Lease | null | undefined): LeaseTenant | undefined {
  return lease?.tenants.find((t) => t.role === 'PRIMARY');
}

export function contactTenants(lease: Lease): LeaseTenant[] {
  return lease.tenants.filter((t) => t.role !== 'PRIMARY');
}
