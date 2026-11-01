'use client';

import { useParams } from 'next/navigation';
import { FormSkeleton } from '@/components/form-skeleton';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { isNotFoundError } from '@/lib/api/api-error';
import { useApartment } from '@/lib/api/queries/apartments';
import { ApartmentForm } from './apartment-form';

export function ApartmentEdit() {
  const { id } = useParams<{ id: string }>();
  const apartment = useApartment(id);

  if (apartment.isPending) return <FormSkeleton fields={2} textarea />;
  if (apartment.isError) {
    return isNotFoundError(apartment.error) ? (
      <NotFoundState title="Квартиру не знайдено" backHref="/" backLabel="До списку квартир" />
    ) : (
      <QueryError error={apartment.error} onRetry={() => void apartment.refetch()} />
    );
  }
  // key: a fresh form (new defaultValues) if the id changes.
  return <ApartmentForm key={apartment.data.id} apartment={apartment.data} />;
}
