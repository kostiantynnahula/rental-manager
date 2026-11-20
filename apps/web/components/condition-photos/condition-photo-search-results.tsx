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

  if (results.isError) {
    return <QueryError error={results.error} onRetry={() => void results.refetch()} />;
  }
  if (results.isPending) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Пошук">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-10 text-center">
        <p className="text-muted-foreground">Нічого не знайдено</p>
        <p className="mt-1 text-sm text-muted-foreground">Шукаються лише вже описані фото</p>
      </div>
    );
  }

  return (
    <>
      {/* Placeholder = the previous query's results while the next one loads. */}
      <ul
        className={cn('space-y-2 transition-opacity', results.isPlaceholderData && 'opacity-60')}
        aria-busy={results.isPlaceholderData}
      >
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
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      збіг {Math.round(photo.score * 100)}%
                    </span>
                  </span>
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
      <ConditionPhotoLightbox photos={list} index={openIndex} onIndexChange={setOpenIndex} />
    </>
  );
}
