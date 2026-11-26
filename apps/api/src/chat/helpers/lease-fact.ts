import { formatDateOnly } from '../../common/helpers/date-only.js';
import { LeaseTenantRole } from '../../generated/prisma/enums.js';
import type { LeaseWithTenants } from '../../leases/helpers/lease-with-tenants.js';

// A lease as the agent sees it: dates and the primary tenant's name. No phones, emails, notes or rent.
export function toLeaseFact(lease: LeaseWithTenants): {
  startDate: string;
  endDate: string | null;
  primaryTenant: string | null;
} {
  const primary = lease.tenants.find((t) => t.role === LeaseTenantRole.PRIMARY);
  return {
    startDate: formatDateOnly(lease.startDate),
    endDate: lease.endDate ? formatDateOnly(lease.endDate) : null,
    primaryTenant: primary?.tenant.fullName ?? null,
  };
}
