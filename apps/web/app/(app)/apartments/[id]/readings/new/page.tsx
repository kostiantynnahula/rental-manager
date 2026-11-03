import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { ReadingEntry } from '@/components/readings/reading-entry';

export const metadata: Metadata = { title: 'Внести показання' };

// Suspense: the apartment id (useParams) is only known at request time.
export default function NewReadingsPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={4} />}>
      <ReadingEntry />
    </Suspense>
  );
}
