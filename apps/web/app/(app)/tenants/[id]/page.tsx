import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TenantDetail } from '@/components/tenants/tenant-detail';
import { TenantDetailSkeleton } from '@/components/tenants/tenant-detail-skeleton';

export const metadata: Metadata = { title: 'Мешканець' };

// Suspense: the id (useParams) is only known at request time.
export default function TenantPage() {
  return (
    <Suspense fallback={<TenantDetailSkeleton />}>
      <TenantDetail />
    </Suspense>
  );
}
