import type { Lease } from '@/lib/api/queries/leases';
import { formatMoney, todayDateOnly } from '@/lib/format';
import { formatLeaseTerm, leaseStatus, primaryTenant } from '@/lib/leases';
import { LeaseStatusBadge } from './lease-status-badge';

// Mobile (< md) row of an apartment's lease history.
export function LeaseCard({ lease }: { lease: Lease }) {
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">
          {primaryTenant(lease)?.fullName ?? 'Без основного орендаря'}
        </span>
        <LeaseStatusBadge status={leaseStatus(lease, todayDateOnly())} />
      </div>
      <p className="text-sm">{formatLeaseTerm(lease.startDate, lease.endDate)}</p>
      <p className="text-sm whitespace-nowrap text-muted-foreground">
        {formatMoney(lease.monthlyRent)} / міс.
      </p>
    </div>
  );
}
