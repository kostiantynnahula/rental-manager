import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TariffDetail } from '@/components/tariffs/tariff-detail';
import { TariffDetailSkeleton } from '@/components/tariffs/tariff-detail-skeleton';

export const metadata: Metadata = { title: 'Тариф' };

// Suspense: the id (useParams) is only known at request time.
export default function TariffPage() {
  return (
    <Suspense fallback={<TariffDetailSkeleton />}>
      <TariffDetail />
    </Suspense>
  );
}
