'use client';

import { QueryError } from '@/components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParam } from '@/hooks/use-search-param';
import type { Apartment } from '@/lib/api/queries/apartments';
import { useApartmentPhotos } from '@/lib/api/queries/photos';
import { cn } from '@/lib/utils';
import { DEFAULT_PHOTO_FILTER, PHOTO_FILTERS } from './constants/filters';
import { parsePhotoFilter } from './helpers/parse-photo-filter';
import { PhotoCard } from './photo-card';
import { UploadPhotosButton } from './upload-photos-button';

const GRID = 'grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4';

// Apartment page, tab "Фото": upload meter photos; by default only those without a reading yet.
export function ApartmentPhotosTab({ apartment }: { apartment: Apartment }) {
  const [filter, setFilter] = useSearchParam('photos', parsePhotoFilter, DEFAULT_PHOTO_FILTER);
  const photos = useApartmentPhotos(apartment.id, filter === 'unassigned');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* The API refuses uploads for an archived apartment. */}
        {apartment.isActive && <UploadPhotosButton apartmentId={apartment.id} />}
        <div
          role="group"
          aria-label="Фільтр"
          className="grid grid-cols-2 rounded-lg bg-muted p-1 sm:ml-auto sm:inline-grid"
        >
          {PHOTO_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'h-10 rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors md:h-8',
                filter === f.value && 'bg-background text-foreground shadow-sm',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {photos.isError ? (
        <QueryError error={photos.error} onRetry={() => void photos.refetch()} />
      ) : photos.isPending ? (
        <div className={GRID} aria-busy="true" aria-label="Завантаження">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : photos.data.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground">
          {filter === 'unassigned' ? 'Нерозібраних фото немає' : 'Фото ще не завантажені'}
        </p>
      ) : (
        // API order: newest first.
        <ul className={GRID}>
          {photos.data.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </ul>
      )}
    </div>
  );
}
