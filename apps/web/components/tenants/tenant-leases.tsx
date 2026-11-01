import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TenantLease } from '@/lib/api/queries/tenants';
import { formatMoney } from '@/lib/format';
import { formatLeaseTerm } from '@/lib/leases';
import { LEASE_ROLE_LABELS } from './constants/roles';

// Newest first (API order); the lease covering today is highlighted.
export function TenantLeases({ leases }: { leases: TenantLease[] }) {
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
              <li
                key={lease.leaseId}
                className={cn(
                  'space-y-1 rounded-lg border p-3',
                  lease.isCurrent && 'border-primary bg-primary/5',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/apartments/${lease.apartmentId}`}
                    className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline md:min-h-0"
                  >
                    {lease.apartmentName}
                  </Link>
                  {lease.isCurrent && <Badge>Поточний</Badge>}
                </div>
                <p className="text-sm">{formatLeaseTerm(lease.startDate, lease.endDate)}</p>
                <p className="text-sm text-muted-foreground">
                  {LEASE_ROLE_LABELS[lease.role]} ·{' '}
                  <span className="whitespace-nowrap">{formatMoney(lease.monthlyRent)} / міс.</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
