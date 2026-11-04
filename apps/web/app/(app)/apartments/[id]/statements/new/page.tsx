import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { StatementNew } from '@/components/statements/statement-new';

export const metadata: Metadata = { title: 'Новий рахунок' };

// Suspense: the id (useParams) and ?period= (useSearchParams) are only known at request time.
export default function NewStatementPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={3} />}>
      <StatementNew />
    </Suspense>
  );
}
