import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton';
import { TenantsList } from '@/components/tenants/tenants-list';

export const metadata: Metadata = { title: 'Мешканці' };

// Suspense: TenantsList reads ?search= (useSearchParams), which isn't known at prerender time.
export default function TenantsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <TenantsList />
    </Suspense>
  );
}
