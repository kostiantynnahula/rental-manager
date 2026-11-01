import type { components } from '@/lib/api/schema';
import { formatDate } from '@/lib/format';

export type Lease = components['schemas']['LeaseResponseDto'];
export type LeaseTenant = components['schemas']['LeaseTenantResponseDto'];

export function primaryTenant(lease: Lease | null | undefined): LeaseTenant | undefined {
  return lease?.tenants.find((t) => t.role === 'PRIMARY');
}

export function contactTenants(lease: Lease): LeaseTenant[] {
  return lease.tenants.filter((t) => t.role !== 'PRIMARY');
}

// "з 01.01.2026 по 31.12.2026" / "з 01.01.2026, безстроково"
export function formatLeaseTerm(startDate: string, endDate: string | null): string {
  return `з ${formatDate(startDate)}${endDate ? ` по ${formatDate(endDate)}` : ', безстроково'}`;
}
