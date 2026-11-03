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
import { useApartmentMeters } from '@/lib/api/queries/meters';
import { UTILITY_ORDER } from '@/lib/utilities';
import { ReadingEntryForm } from './reading-entry-form';

// /apartments/[id]/readings/new
export function ReadingEntry() {
  const { id } = useParams<{ id: string }>();
  const apartment = useApartment(id);
  const meters = useApartmentMeters(id, false);

  if (apartment.isPending || meters.isPending) return <FormSkeleton fields={4} />;
  if (apartment.isError) {
    return isNotFoundError(apartment.error) ? (
      <NotFoundState title="Квартиру не знайдено" backHref="/" backLabel="До списку квартир" />
    ) : (
      <QueryError error={apartment.error} onRetry={() => void apartment.refetch()} />
    );
  }
  if (meters.isError)
    return <QueryError error={meters.error} onRetry={() => void meters.refetch()} />;

  // Same order as the meters tab: by utility, then the API's order (label, newest first).
  const ordered = UTILITY_ORDER.flatMap((u) => meters.data.filter((m) => m.utility === u));

  return (
    <section className="space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href={`/apartments/${id}?tab=readings`}>
          <ChevronLeft />
          {apartment.data.name}
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold">Внести показання</h1>
      {ordered.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed px-4 py-10 text-center">
          <p className="text-muted-foreground">Немає активних лічильників</p>
          <Button asChild variant="outline">
            <Link href={`/apartments/${id}?tab=meters`}>До лічильників</Link>
          </Button>
        </div>
      ) : (
        <ReadingEntryForm apartmentId={id} meters={ordered} />
      )}
    </section>
  );
}
