'use client';

import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ApiImage } from './api-image';

const FILL = { width: '100%', height: '100%' } as const;

interface PhotoFullscreenProps {
  // The original (`fileUrl`); without it `children` is shown instead (loading / error state).
  src?: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}

// Fullscreen photo with pinch zoom / pan / double-tap, so the meter digits are readable on a phone.
export function PhotoFullscreen({ src, alt, open, onOpenChange, children }: PhotoFullscreenProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="inset-0 top-0 left-0 block h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none bg-black p-0 text-white ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {src ? (
          <TransformWrapper centerOnInit maxScale={8} doubleClick={{ mode: 'toggle', step: 2 }}>
            <TransformComponent wrapperStyle={FILL} contentStyle={FILL}>
              <ApiImage src={src} alt={alt} loading="eager" className="size-full object-contain" />
            </TransformComponent>
          </TransformWrapper>
        ) : (
          <div className="flex size-full items-center justify-center p-6 text-center">
            {children}
          </div>
        )}
        <DialogClose
          className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-2 inline-flex size-11 items-center justify-center rounded-full bg-black/60 text-white"
          aria-label="Закрити"
        >
          <XIcon className="size-5" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
