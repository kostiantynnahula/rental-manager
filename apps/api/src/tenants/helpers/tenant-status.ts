// Where a tenant stands today, from the date ranges of their leases (endDate inclusive, null = open-ended).
// Same rule as apartments/helpers/current-lease-where.ts, computed in memory.

export const TENANT_STATUSES = ['LIVING', 'FORMER', 'NONE'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export interface LeaseDates {
  startDate: Date;
  endDate: Date | null;
}

export function isLeaseCurrent(lease: LeaseDates, today: Date): boolean {
  return lease.startDate <= today && (lease.endDate === null || lease.endDate >= today);
}

// LIVING: a lease covers today. FORMER: only ended leases (besides future ones). NONE: no leases, or only future.
export function tenantStatus(leases: LeaseDates[], today: Date): TenantStatus {
  if (leases.some((l) => isLeaseCurrent(l, today))) return 'LIVING';
  if (leases.some((l) => l.endDate !== null && l.endDate < today)) return 'FORMER';
  return 'NONE';
}
