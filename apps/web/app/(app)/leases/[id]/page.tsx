import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LeaseDetail } from '@/components/leases/lease-detail';
import { LeaseDetailSkeleton } from '@/components/leases/lease-detail-skeleton';

export const metadata: Metadata = { title: 'Договір' };

// Suspense: the id (useParams) and ?from= (useSearchParams) are only known at request time.
export default function LeasePage() {
  return (
    <Suspense fallback={<LeaseDetailSkeleton />}>
      <LeaseDetail />
    </Suspense>
  );
}
