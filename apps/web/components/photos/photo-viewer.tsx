'use client';

import { Maximize2, XIcon } from 'lucide-react';
import { useState } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { PhotoDetail } from '@/lib/api/queries/photos';
import { ApiImage } from './api-image';

const FILL = { width: '100%', height: '100%' } as const;

// The original on top of the review screen; tap → fullscreen with pinch zoom / pan / double-tap, so the digits
// are readable on a phone.
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="inset-0 top-0 left-0 block h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none bg-black p-0 ring-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <TransformWrapper centerOnInit maxScale={8} doubleClick={{ mode: 'toggle', step: 2 }}>
            <TransformComponent wrapperStyle={FILL} contentStyle={FILL}>
              <ApiImage
                src={photo.fileUrl}
                alt={alt}
                loading="eager"
                className="size-full object-contain"
              />
            </TransformComponent>
          </TransformWrapper>
          <DialogClose
            className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-2 inline-flex size-11 items-center justify-center rounded-full bg-black/60 text-white"
            aria-label="Закрити"
          >
            <XIcon className="size-5" />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
