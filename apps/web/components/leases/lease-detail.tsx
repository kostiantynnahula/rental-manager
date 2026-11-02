'use client';

import { ChevronLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isNotFoundError } from '@/lib/api/api-error';
import { useApartment } from '@/lib/api/queries/apartments';
import { useLease } from '@/lib/api/queries/leases';
import { formatMoney, todayDateOnly } from '@/lib/format';
import { contactTenants, formatLeaseTerm, leaseStatus, primaryTenant } from '@/lib/leases';
import { DeleteLeaseButton } from './delete-lease-button';
import { EndLeaseDialog } from './end-lease-dialog';
import { leaseBackTarget, originQuery } from './helpers/lease-back-target';
import { useLeaseOrigin } from './hooks/use-lease-origin';
import { LeaseDetailSkeleton } from './lease-detail-skeleton';
import { LeaseStatusBadge } from './lease-status-badge';
import { LeaseTenantLine } from './lease-tenant-line';

// /leases/[id]
export function LeaseDetail() {
  const { id } = useParams<{ id: string }>();
  const origin = useLeaseOrigin();
  const lease = useLease(id);
  const apartmentId = lease.data?.apartmentId ?? '';
  const apartment = useApartment(apartmentId, { enabled: apartmentId !== '' });

  if (lease.isPending) return <LeaseDetailSkeleton />;
  if (lease.isError) {
    return isNotFoundError(lease.error) ? (
      <NotFoundState title="Договір не знайдено" backHref="/" backLabel="До списку квартир" />
    ) : (
      <QueryError error={lease.error} onRetry={() => void lease.refetch()} />
    );
  }

  const data = lease.data;
  const back = leaseBackTarget(origin, data.apartmentId);
  const primary = primaryTenant(data);
  const contacts = contactTenants(data);
  const apartmentName = apartment.data?.name ?? 'Квартира';

  return (
    <section className="space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href={back.href}>
          <ChevronLeft />
          {back.label}
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">Договір</h1>
            <LeaseStatusBadge status={leaseStatus(data, todayDateOnly())} />
          </div>
          <Link
            href={`/apartments/${data.apartmentId}`}
            className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline md:min-h-0"
          >
            {apartmentName}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:flex-wrap sm:justify-end">
          <Button asChild variant="outline">
            <Link href={`/leases/${data.id}/edit${originQuery(origin)}`}>
              <Pencil />
              Редагувати
            </Link>
          </Button>
          {data.endDate === null && <EndLeaseDialog lease={data} />}
          <DeleteLeaseButton lease={data} backHref={back.href} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Умови</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-muted-foreground">Термін</dt>
                <dd>{formatLeaseTerm(data.startDate, data.endDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Оренда</dt>
                <dd className="font-medium">{formatMoney(data.monthlyRent)} / міс.</dd>
              </div>
              {data.notes && (
                <div>
                  <dt className="text-muted-foreground">Нотатки</dt>
                  <dd className="whitespace-pre-wrap">{data.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Мешканці</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {primary && (
                <div>
                  <dt className="text-muted-foreground">Основний орендар</dt>
                  <dd>
                    <LeaseTenantLine tenant={primary} />
                  </dd>
                </div>
              )}
              {contacts.length > 0 && (
                <div>
                  <dt className="text-muted-foreground">Контактні особи</dt>
                  {contacts.map((t) => (
                    <dd key={t.tenantId}>
                      <LeaseTenantLine tenant={t} />
                    </dd>
                  ))}
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
