import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TenantLease } from '@/lib/api/queries/tenants';
import { formatMoney } from '@/lib/format';
import { formatLeaseTerm } from '@/lib/leases';
import { LEASE_ROLE_LABELS } from './constants/roles';

// Newest first (API order); the lease covering today is highlighted. Each item opens the lease; ?from=tenant
// brings "back" to this tenant.
export function TenantLeases({ tenantId, leases }: { tenantId: string; leases: TenantLease[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Договори</CardTitle>
      </CardHeader>
      <CardContent>
        {leases.length === 0 ? (
          <p className="text-muted-foreground">Договорів немає</p>
        ) : (
          <ul className="space-y-2">
            {leases.map((lease) => (
              <li key={lease.leaseId}>
                <Link
                  href={`/leases/${lease.leaseId}?from=tenant&tenantId=${tenantId}`}
                  className={cn(
                    'block space-y-1 rounded-lg border p-3 transition-colors hover:bg-muted active:bg-muted',
                    lease.isCurrent && 'border-primary bg-primary/5',
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{lease.apartmentName}</span>
                    {lease.isCurrent && <Badge>Поточний</Badge>}
                  </span>
                  <span className="block text-sm">
                    {formatLeaseTerm(lease.startDate, lease.endDate)}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {LEASE_ROLE_LABELS[lease.role]} ·{' '}
                    <span className="whitespace-nowrap">
                      {formatMoney(lease.monthlyRent)} / міс.
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
