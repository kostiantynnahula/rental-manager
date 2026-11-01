import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ApartmentDetail } from '@/components/apartments/apartment-detail';
import { ApartmentDetailSkeleton } from '@/components/apartments/apartment-detail-skeleton';

export const metadata: Metadata = { title: 'Квартира' };

// Suspense: the id (useParams) and ?tab= (useSearchParams) are only known at request time.
export default function ApartmentPage() {
  return (
    <Suspense fallback={<ApartmentDetailSkeleton />}>
      <ApartmentDetail />
    </Suspense>
  );
}
