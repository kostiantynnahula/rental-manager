'use client';

import { useParams } from 'next/navigation';
import { FormSkeleton } from '@/components/form-skeleton';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { isNotFoundError } from '@/lib/api/api-error';
import { useTariff } from '@/lib/api/queries/tariffs';
import { TariffForm } from './tariff-form';

export function TariffEdit() {
  const { id } = useParams<{ id: string }>();
  const tariff = useTariff(id);

  if (tariff.isPending) return <FormSkeleton fields={3} textarea />;
  if (tariff.isError) {
    return isNotFoundError(tariff.error) ? (
      <NotFoundState title="Тариф не знайдено" backHref="/tariffs" backLabel="До списку тарифів" />
    ) : (
      <QueryError error={tariff.error} onRetry={() => void tariff.refetch()} />
    );
  }
  // key: a fresh form (new defaultValues) if the id changes.
  return <TariffForm key={tariff.data.id} tariff={tariff.data} />;
}
