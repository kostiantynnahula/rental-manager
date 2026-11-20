'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import type { ConditionPhoto } from '@/lib/api/queries/condition-photos';
import { cn } from '@/lib/utils';
import { INDEX_STATUS_LABELS } from './constants/index-status';
import { ROOM_LABELS } from './constants/rooms';

// The lightbox's detail: index status (not searchable yet / failed) and the worker's description, collapsed by
// default so it doesn't cover the photo on a phone. Light text: it sits on the dark fullscreen footer.
export function ConditionPhotoDescription({ photo }: { photo: ConditionPhoto }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const status = INDEX_STATUS_LABELS[photo.indexStatus];
  const description = photo.description;
  const room = description ? ROOM_LABELS[description.room] : null;

  return (
    <div className="mt-1 text-white/80">
      {status && (
        <p className="text-xs text-white/60">
          {status}
          {photo.indexStatus === 'FAILED' && photo.indexNote && `: ${photo.indexNote}`}
        </p>
      )}
      {description && (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 items-center gap-1 px-2 text-sm font-medium text-white md:h-8"
          >
            Опис
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <div
              id={panelId}
              className="max-h-[40dvh] space-y-1 overflow-y-auto text-left text-sm break-words"
            >
              {room && <p className="font-medium text-white">{room}</p>}
              <p className="whitespace-pre-wrap">{description.summary}</p>
              {description.items.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5">
                  {description.items.map((item, i) => (
                    <li key={i}>
                      {item.name}
                      {item.count !== undefined && item.count > 1 && ` ×${item.count}`}
                      {item.condition && <span className="text-white/60"> — {item.condition}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
