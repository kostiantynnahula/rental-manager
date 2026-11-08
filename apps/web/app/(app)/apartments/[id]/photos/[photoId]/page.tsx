import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PhotoReview } from '@/components/photos/photo-review';
import { PhotoReviewSkeleton } from '@/components/photos/photo-review-skeleton';

export const metadata: Metadata = { title: 'Фото лічильника' };

// Suspense: the apartment and photo ids (useParams) are only known at request time.
export default function PhotoReviewPage() {
  return (
    <Suspense fallback={<PhotoReviewSkeleton />}>
      <PhotoReview />
    </Suspense>
  );
}
