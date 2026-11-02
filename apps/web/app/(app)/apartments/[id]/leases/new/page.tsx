import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { LeaseCreate } from '@/components/leases/lease-create';

export const metadata: Metadata = { title: 'Новий договір' };

// Suspense: the apartment id (useParams) is only known at request time.
export default function NewLeasePage() {
  return (
    <Suspense fallback={<FormSkeleton fields={3} textarea />}>
      <LeaseCreate />
    </Suspense>
  );
}
