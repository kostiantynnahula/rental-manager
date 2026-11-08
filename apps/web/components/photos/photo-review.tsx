'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { isNotFoundError } from '@/lib/api/api-error';
import { useApartment } from '@/lib/api/queries/apartments';
import { useApartmentMeters } from '@/lib/api/queries/meters';
import { usePhoto } from '@/lib/api/queries/photos';
import { formatInstantDate } from '@/lib/format';
import { PhotoLinkedReadings } from './photo-linked-readings';
import { PhotoReadingForm } from './photo-reading-form';
import { PhotoReviewSkeleton } from './photo-review-skeleton';
import { PhotoViewer } from './photo-viewer';

// /apartments/[id]/photos/[photoId]: the photo on top, the readings taken from it, then a form for one more.
export function PhotoReview() {
  const { id, photoId } = useParams<{ id: string; photoId: string }>();
  const apartment = useApartment(id);
  const photo = usePhoto(photoId);
  // Incl. removed: a meter removed later can still be the one on an older photo.
  const meters = useApartmentMeters(id, true);
  const tabHref = `/apartments/${id}?tab=photos`;

  if (apartment.isPending || photo.isPending || meters.isPending) return <PhotoReviewSkeleton />;
  if (apartment.isError) {
    return isNotFoundError(apartment.error) ? (
      <NotFoundState title="Квартиру не знайдено" backHref="/" backLabel="До списку квартир" />
    ) : (
      <QueryError error={apartment.error} onRetry={() => void apartment.refetch()} />
    );
  }
  if (photo.isError && !isNotFoundError(photo.error))
    return <QueryError error={photo.error} onRetry={() => void photo.refetch()} />;
  if (photo.isError || photo.data.apartmentId !== id)
    return <NotFoundState title="Фото не знайдено" backHref={tabHref} backLabel="До фото" />;
  if (meters.isError)
    return <QueryError error={meters.error} onRetry={() => void meters.refetch()} />;

  const date = formatInstantDate(photo.data.createdAt);

  return (
    <section className="max-w-2xl space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href={tabHref}>
          <ChevronLeft />
          {apartment.data.name}
        </Link>
      </Button>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Фото лічильника</h1>
        <p className="text-sm text-muted-foreground">Завантажено {date}</p>
      </div>
      <PhotoViewer photo={photo.data} alt={`Фото лічильника від ${date}`} />
      <PhotoLinkedReadings readings={photo.data.readings} meters={meters.data} />
      {/* key: the page stays mounted (hidden) between photos, so another photo needs a fresh form. */}
      <PhotoReadingForm key={photoId} apartmentId={id} photo={photo.data} meters={meters.data} />
    </section>
  );
}
