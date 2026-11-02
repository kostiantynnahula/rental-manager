import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { MeterReplace } from '@/components/meters/meter-replace';

export const metadata: Metadata = { title: 'Заміна лічильника' };

// Suspense: the meter id (useParams) is only known at request time.
export default function ReplaceMeterPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={5} />}>
      <MeterReplace />
    </Suspense>
  );
}
