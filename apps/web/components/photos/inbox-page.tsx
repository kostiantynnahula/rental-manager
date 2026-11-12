'use client';

import { QueryError } from '@/components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useApartments } from '@/lib/api/queries/apartments';
import { useInboxPhotos } from '@/lib/api/queries/photos';
import { InboxPhotoCard } from './inbox-photo-card';
import { UploadPhotosButton } from './upload-photos-button';

const GRID = 'grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

// «Вхідні»: photos uploaded without an apartment. The worker finds the apartment by the meter's serial number;
// the rest wait here for a human to pick one.
export function InboxPage() {
  const photos = useInboxPhotos();
  // Only active apartments: the API refuses an archived one.
  const apartments = useApartments('true');

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Вхідні</h1>
        <p className="text-sm text-muted-foreground">
          Фото без квартири. Розпізнані за серійним номером автоматично переходять до квартири.
        </p>
      </div>
      <UploadPhotosButton apartmentId={null} />

      {photos.isError ? (
        <QueryError error={photos.error} onRetry={() => void photos.refetch()} />
      ) : apartments.isError ? (
        <QueryError error={apartments.error} onRetry={() => void apartments.refetch()} />
      ) : photos.isPending || apartments.isPending ? (
        <div className={GRID} aria-busy="true" aria-label="Завантаження">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : photos.data.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground">
          Вхідних фото немає
        </p>
      ) : (
        // API order: newest first.
        <ul className={GRID}>
          {photos.data.map((photo) => (
            <InboxPhotoCard key={photo.id} photo={photo} apartments={apartments.data} />
          ))}
        </ul>
      )}
    </section>
  );
}
