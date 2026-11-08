'use client';

import { Maximize2 } from 'lucide-react';
import { useState } from 'react';
import type { PhotoDetail } from '@/lib/api/queries/photos';
import { ApiImage } from './api-image';
import { PhotoFullscreen } from './photo-fullscreen';

// The original on top of the review screen; tap → fullscreen with zoom.
export function PhotoViewer({ photo, alt }: { photo: PhotoDetail; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block w-full overflow-hidden rounded-lg border bg-muted"
        aria-label="Відкрити фото на весь екран"
      >
        <ApiImage
          src={photo.fileUrl}
          alt={alt}
          loading="eager"
          width={photo.width}
          height={photo.height}
          className="mx-auto max-h-[60vh] w-full object-contain"
        />
        <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
          <Maximize2 className="size-3.5" aria-hidden />
          Збільшити
        </span>
      </button>
      <PhotoFullscreen src={photo.fileUrl} alt={alt} open={open} onOpenChange={setOpen} />
    </>
  );
}
