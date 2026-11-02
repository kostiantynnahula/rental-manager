import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { MeterCreate } from '@/components/meters/meter-create';

export const metadata: Metadata = { title: 'Новий лічильник' };

// Suspense: the apartment id (useParams) is only known at request time.
export default function NewMeterPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={4} />}>
      <MeterCreate />
    </Suspense>
  );
}
