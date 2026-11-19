'use client';

import { useMemo, useState } from 'react';
import { QueryError } from '@/components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useConditionPhotos,
  type ConditionPhotoEvent,
  type ConditionPhotoRange,
} from '@/lib/api/queries/condition-photos';
import { formatDate } from '@/lib/format';
import { ConditionPhotoCard } from './condition-photo-card';
import { ConditionPhotoLightbox } from './condition-photo-lightbox';
import { EVENT_LABELS } from './constants/events';
import { groupByDayEvent } from './helpers/group-by-day-event';
import { UploadConditionPhotosSheet } from './upload-condition-photos-sheet';

const GRID = 'grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4';

interface ConditionPhotoTimelineProps {
  apartmentId: string;
  range?: ConditionPhotoRange;
  // false for an archived apartment (the API refuses uploads).
  canUpload: boolean;
  defaultEvent: ConditionPhotoEvent;
  emptyText: string;
}

// Groups by date + event (newest first), thumbnails → lightbox over the whole list. Apartment tab and lease page.
export function ConditionPhotoTimeline({
  apartmentId,
  range,
  canUpload,
  defaultEvent,
  emptyText,
}: ConditionPhotoTimelineProps) {
  const photos = useConditionPhotos(apartmentId, range);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const list = photos.data;
  const groups = useMemo(() => groupByDayEvent(list ?? []), [list]);
  // Groups keep the API order, so the lightbox walks the same flat list.
  const flat = useMemo(() => groups.flatMap((g) => g.photos), [groups]);
  const indexOf = useMemo(() => new Map(flat.map((p, i) => [p.id, i])), [flat]);

  return (
    <div className="space-y-4">
      {canUpload && (
        <UploadConditionPhotosSheet apartmentId={apartmentId} defaultEvent={defaultEvent} />
      )}

      {photos.isError ? (
        <QueryError error={photos.error} onRetry={() => void photos.refetch()} />
      ) : photos.isPending ? (
        <div className={GRID} aria-busy="true" aria-label="Завантаження">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`condition-group-${group.key}`}>
              <h3 id={`condition-group-${group.key}`} className="mb-2 font-medium">
                {EVENT_LABELS[group.event]} · {formatDate(group.takenOn)}
                <span className="text-muted-foreground"> · {group.photos.length}</span>
              </h3>
              <ul className={GRID}>
                {group.photos.map((photo) => (
                  <ConditionPhotoCard
                    key={photo.id}
                    photo={photo}
                    onOpen={() => setOpenIndex(indexOf.get(photo.id) ?? null)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ConditionPhotoLightbox photos={flat} index={openIndex} onIndexChange={setOpenIndex} />
    </div>
  );
}
