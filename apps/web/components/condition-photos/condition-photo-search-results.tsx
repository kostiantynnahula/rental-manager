'use client';

import { useState } from 'react';
import { ApiImage } from '@/components/photos/api-image';
import { QueryError } from '@/components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useConditionPhotoSearch,
  type ConditionPhotoEvent,
} from '@/lib/api/queries/condition-photos';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ConditionPhotoLightbox } from './condition-photo-lightbox';
import { EVENT_LABELS } from './constants/events';

interface ConditionPhotoSearchResultsProps {
  apartmentId: string;
  // Trimmed, non-empty.
  query: string;
  event: ConditionPhotoEvent | undefined;
}

// Most relevant first (API order); a row opens the lightbox over the results.
export function ConditionPhotoSearchResults({
  apartmentId,
  query,
  event,
}: ConditionPhotoSearchResultsProps) {
  const results = useConditionPhotoSearch(apartmentId, query, event);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const list = results.data ?? [];

  // Placeholder = the previous query's results (or its empty state) while the next one loads: dimmed.
  const dim = cn('transition-opacity', results.isPlaceholderData && 'opacity-60');

  return (
    <>
      {results.isError ? (
        <QueryError error={results.error} onRetry={() => void results.refetch()} />
      ) : results.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Пошук">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div
          className={cn('rounded-lg border border-dashed px-4 py-10 text-center', dim)}
          aria-busy={results.isPlaceholderData}
        >
          <p className="text-muted-foreground">Нічого не знайдено</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Шукаються лише фото, вже додані до пошуку
          </p>
        </div>
      ) : (
        <ul className={cn('space-y-2', dim)} aria-busy={results.isPlaceholderData}>
          {list.map((photo, index) => {
            const label = `${EVENT_LABELS[photo.event]} · ${formatDate(photo.takenOn)}`;
            return (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  aria-label={`Відкрити фото: ${label}`}
                  className="flex w-full gap-3 rounded-lg border bg-card p-2 text-left"
                >
                  <ApiImage
                    src={photo.thumbnailUrl}
                    alt=""
                    className="size-20 shrink-0 rounded-md bg-muted object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    {/* No score: every result already passed the API's relevance threshold. */}
                    <span className="block font-medium">{label}</span>
                    {photo.description && (
                      <span className="mt-1 line-clamp-2 text-sm break-words text-muted-foreground">
                        {photo.description.summary}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Always rendered (as in the timeline): it closes itself when a refetch empties the results. */}
      <ConditionPhotoLightbox photos={list} index={openIndex} onIndexChange={setOpenIndex} />
    </>
  );
}
