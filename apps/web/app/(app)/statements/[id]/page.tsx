import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { StatementDetail } from '@/components/statements/statement-detail';

export const metadata: Metadata = { title: 'Рахунок' };

// Suspense: the id (useParams) is only known at request time.
export default function StatementPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={3} />}>
      <StatementDetail />
    </Suspense>
  );
}
