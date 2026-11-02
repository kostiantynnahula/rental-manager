'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { isNotFoundError } from '@/lib/api/api-error';
import { useLease } from '@/lib/api/queries/leases';
import { originQuery } from './helpers/lease-back-target';
import { useLeaseOrigin } from './hooks/use-lease-origin';
import { LeaseTenantsForm } from './lease-tenants-form';
import { LeaseTermsForm } from './lease-terms-form';

// /leases/[id]/edit: "Умови" (PATCH) and "Мешканці" (PUT) are separate forms with their own save buttons;
// one unsaved-changes guard covers both.
export function LeaseEdit() {
  const { id } = useParams<{ id: string }>();
  const origin = useLeaseOrigin();
  const lease = useLease(id);
  const [termsDirty, setTermsDirty] = useState(false);
  const [tenantsDirty, setTenantsDirty] = useState(false);
  const { dialog } = useUnsavedChanges(termsDirty || tenantsDirty);

  if (lease.isPending) return <FormSkeleton fields={3} textarea />;
  if (lease.isError) {
    return isNotFoundError(lease.error) ? (
      <NotFoundState title="Договір не знайдено" backHref="/" backLabel="До списку квартир" />
    ) : (
      <QueryError error={lease.error} onRetry={() => void lease.refetch()} />
    );
  }

  const detailHref = `/leases/${lease.data.id}${originQuery(origin)}`;

  return (
    <section className="max-w-2xl space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href={detailHref}>
          <ChevronLeft />
          Договір
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold">Редагування договору</h1>
      {/* Keyed by id only: a background refetch after saving one section must not reset the other one. */}
      <Card key={`terms-${lease.data.id}`}>
        <CardHeader>
          <CardTitle>Умови</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaseTermsForm lease={lease.data} onDirtyChange={setTermsDirty} />
        </CardContent>
      </Card>
      <Card key={`tenants-${lease.data.id}`}>
        <CardHeader>
          <CardTitle>Мешканці</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaseTenantsForm lease={lease.data} onDirtyChange={setTenantsDirty} />
        </CardContent>
      </Card>
      <Button asChild variant="outline" className="w-full sm:w-auto">
        <Link href={detailHref}>Готово</Link>
      </Button>
      {dialog}
    </section>
  );
}
