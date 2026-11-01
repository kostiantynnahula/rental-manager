import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { TenantEdit } from '@/components/tenants/tenant-edit';

export const metadata: Metadata = { title: 'Редагування мешканця' };

export default function EditTenantPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Редагування мешканця</h1>
      <Suspense fallback={<FormSkeleton fields={3} textarea />}>
        <TenantEdit />
      </Suspense>
    </section>
  );
}
