import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ConditionPhotoPage } from '@/components/condition-photos/condition-photo-page';
import { ConditionPhotoPageSkeleton } from '@/components/condition-photos/condition-photo-page-skeleton';

export const metadata: Metadata = { title: 'Фото стану' };

// Suspense: the apartment and photo ids (useParams) are only known at request time.
export default function ConditionPhotoRoute() {
  return (
    <Suspense fallback={<ConditionPhotoPageSkeleton />}>
      <ConditionPhotoPage />
    </Suspense>
  );
}
