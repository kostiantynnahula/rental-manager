import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ApartmentsList } from '@/components/apartments/apartments-list';
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton';

export const metadata: Metadata = { title: 'Квартири' };

// Suspense: ApartmentsList reads ?active= (useSearchParams), which isn't known at prerender time.
export default function ApartmentsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <ApartmentsList />
    </Suspense>
  );
}
