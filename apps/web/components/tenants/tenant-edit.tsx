'use client';

import { useParams } from 'next/navigation';
import { FormSkeleton } from '@/components/form-skeleton';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { isNotFoundError } from '@/lib/api/api-error';
import { useTenant } from '@/lib/api/queries/tenants';
import { TenantFormPage } from './tenant-form-page';

export function TenantEdit() {
  const { id } = useParams<{ id: string }>();
  const tenant = useTenant(id);

  if (tenant.isPending) return <FormSkeleton fields={3} textarea />;
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
  // key: a fresh form (new defaultValues) if the id changes.
  return <TenantFormPage key={tenant.data.id} tenant={tenant.data} />;
}
