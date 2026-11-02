import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/format';
import { contactTenants, formatLeaseTerm, primaryTenant, type Lease } from '@/lib/leases';
import { LeaseTenantLine } from './lease-tenant-line';

// The apartment's lease covering today (overview and Договори tab).
export function CurrentLeaseCard({ lease }: { lease: Lease | null }) {
  const primary = primaryTenant(lease);
  const contacts = lease ? contactTenants(lease) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Поточний договір</CardTitle>
      </CardHeader>
      <CardContent>
        {lease ? (
          <dl className="space-y-4">
            {primary && (
              <div>
                <dt className="text-muted-foreground">Орендар</dt>
                <dd>
                  <LeaseTenantLine tenant={primary} />
                </dd>
              </div>
            )}
            {contacts.length > 0 && (
              <div>
                <dt className="text-muted-foreground">Контакти</dt>
                {contacts.map((contact) => (
                  <dd key={contact.tenantId}>
                    <LeaseTenantLine tenant={contact} />
                  </dd>
                ))}
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Оренда</dt>
              <dd className="font-medium">{formatMoney(lease.monthlyRent)} / міс.</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Термін</dt>
              <dd>{formatLeaseTerm(lease.startDate, lease.endDate)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground">Немає активного договору</p>
        )}
      </CardContent>
      {lease && (
        <CardFooter>
          <Link
            href={`/leases/${lease.id}?from=apartment`}
            className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline md:min-h-0"
          >
            Деталі договору
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
