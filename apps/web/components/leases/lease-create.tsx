'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormSkeleton } from '@/components/form-skeleton';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { isNotFoundError } from '@/lib/api/api-error';
import { useApartment } from '@/lib/api/queries/apartments';
import { LeaseCreateForm } from './lease-create-form';

// /apartments/[id]/leases/new
export function LeaseCreate() {
  const { id } = useParams<{ id: string }>();
  const apartment = useApartment(id);

  if (apartment.isPending) return <FormSkeleton fields={3} textarea />;
  if (apartment.isError) {
    return isNotFoundError(apartment.error) ? (
      <NotFoundState title="Квартиру не знайдено" backHref="/" backLabel="До списку квартир" />
    ) : (
      <QueryError error={apartment.error} onRetry={() => void apartment.refetch()} />
    );
  }

  const data = apartment.data;
  return (
    <section className="space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href={`/apartments/${data.id}?tab=leases`}>
          <ChevronLeft />
          {data.name}
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold">Новий договір</h1>
      {data.isActive ? (
        <LeaseCreateForm apartment={data} />
      ) : (
        <p role="status" className="rounded-lg border bg-muted px-4 py-3 text-sm">
          Квартира в архіві: новий договір створити не можна.
        </p>
      )}
    </section>
  );
}
