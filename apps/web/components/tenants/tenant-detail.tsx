'use client';

import { ChevronLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isNotFoundError } from '@/lib/api/api-error';
import { useTenant } from '@/lib/api/queries/tenants';
import { DeleteTenantButton } from './delete-tenant-button';
import { TenantContacts } from './tenant-contacts';
import { TenantDetailSkeleton } from './tenant-detail-skeleton';
import { TenantLeases } from './tenant-leases';

export function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const tenant = useTenant(id);

  if (tenant.isPending) return <TenantDetailSkeleton />;
  if (tenant.isError) {
    return isNotFoundError(tenant.error) ? (
      <NotFoundState
        title="Мешканця не знайдено"
        backHref="/tenants"
        backLabel="До списку мешканців"
      />
    ) : (
      <QueryError error={tenant.error} onRetry={() => void tenant.refetch()} />
    );
  }

  const data = tenant.data;

  return (
    <section className="space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href="/tenants">
          <ChevronLeft />
          Мешканці
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="min-w-0 text-2xl font-semibold break-words">{data.fullName}</h1>
        <div className="grid grid-cols-2 items-start gap-2 sm:flex sm:shrink-0">
          <Button asChild variant="outline">
            <Link href={`/tenants/${data.id}/edit`}>
              <Pencil />
              Редагувати
            </Link>
          </Button>
          <DeleteTenantButton tenant={data} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TenantContacts tenant={data} />
        {data.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Нотатки</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{data.notes}</p>
            </CardContent>
          </Card>
        )}
        <div className="md:col-span-2">
          <TenantLeases leases={data.leases} />
        </div>
      </div>
    </section>
  );
}
