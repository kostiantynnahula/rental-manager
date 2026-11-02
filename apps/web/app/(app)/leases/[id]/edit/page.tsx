import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { LeaseEdit } from '@/components/leases/lease-edit';

export const metadata: Metadata = { title: 'Редагування договору' };

export default function EditLeasePage() {
  return (
    <Suspense fallback={<FormSkeleton fields={3} textarea />}>
      <LeaseEdit />
    </Suspense>
  );
}
