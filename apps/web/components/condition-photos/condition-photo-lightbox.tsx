'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { PhotoFullscreen } from '@/components/photos/photo-fullscreen';
import type { ConditionPhoto } from '@/lib/api/queries/condition-photos';
import { formatDate } from '@/lib/format';
import { EVENT_LABELS } from './constants/events';

interface ConditionPhotoLightboxProps {
  photos: ConditionPhoto[];
  // null = closed.
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

const NAV =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30';

// The zoomable fullscreen photo of the review screen, plus ‹ › over the whole list on screen and a caption.
export function ConditionPhotoLightbox({
  photos,
  index,
  onIndexChange,
}: ConditionPhotoLightboxProps) {
  // A photo deleted/moved by a refetch: clamp instead of showing nothing.
  const current = index === null ? null : Math.min(index, photos.length - 1);
  const photo = current === null || current < 0 ? undefined : photos[current];
  const hasPrev = current !== null && current > 0;
  const hasNext = current !== null && current < photos.length - 1;

  // The list emptied while open (last photo deleted): close, or the next upload would reopen it by itself.
  useEffect(() => {
    if (index !== null && photos.length === 0) onIndexChange(null);
  }, [index, photos.length, onIndexChange]);

  useEffect(() => {
    if (current === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && current !== null && current > 0) onIndexChange(current - 1);
      if (e.key === 'ArrowRight' && current !== null && current < photos.length - 1)
        onIndexChange(current + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, photos.length, onIndexChange]);

  if (!photo || current === null) return null;
  const caption = `${EVENT_LABELS[photo.event]} · ${formatDate(photo.takenOn)}`;

  return (
    <PhotoFullscreen
      src={photo.fileUrl}
      alt={caption}
      open
      onOpenChange={(open) => !open && onIndexChange(null)}
      footer={
        <div className="flex items-end gap-2">
          <button
            type="button"
            className={NAV}
            aria-label="Попереднє фото"
            disabled={!hasPrev}
            onClick={() => onIndexChange(current - 1)}
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1 text-center text-sm">
            <p className="font-medium">
              {caption}
              <span className="text-white/60">
                {' '}
                · {current + 1} з {photos.length}
              </span>
            </p>
            {photo.note && (
              <p className="mt-1 line-clamp-3 break-words whitespace-pre-wrap text-white/80">
                {photo.note}
              </p>
            )}
          </div>
          <button
            type="button"
            className={NAV}
            aria-label="Наступне фото"
            disabled={!hasNext}
            onClick={() => onIndexChange(current + 1)}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      }
    />
  );
}
