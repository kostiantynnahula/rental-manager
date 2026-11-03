import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton';
import { TariffsList } from '@/components/tariffs/tariffs-list';

export const metadata: Metadata = { title: 'Тарифи' };

// Suspense: TariffsList reads its filters from the URL (useSearchParams), unknown at prerender time.
export default function TariffsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <TariffsList />
    </Suspense>
  );
}
