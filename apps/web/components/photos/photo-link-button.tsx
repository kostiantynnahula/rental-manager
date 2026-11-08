'use client';

import { Camera, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiErrorMessage, isNotFoundError } from '@/lib/api/api-error';
import { usePhoto } from '@/lib/api/queries/photos';
import { PhotoFullscreen } from './photo-fullscreen';

// 📷 next to a value taken from a photo (history, statements): opens the original fullscreen. The photo is
// loaded only on tap; a statement snapshot can outlive the photo (deleted after its reading was cancelled).
export function PhotoLinkButton({ photoId, label }: { photoId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const photo = usePhoto(photoId, { enabled: open });
  const alt = `Фото показання: ${label}`;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={alt}
        title="Фото показання"
        onClick={() => setOpen(true)}
        className="-my-2 shrink-0"
      >
        <Camera />
      </Button>
      <PhotoFullscreen src={photo.data?.fileUrl} alt={alt} open={open} onOpenChange={setOpen}>
        {photo.isError ? (
          <p>{isNotFoundError(photo.error) ? 'Фото видалено' : apiErrorMessage(photo.error)}</p>
        ) : (
          <Loader2 className="size-8 animate-spin" aria-label="Завантаження" />
        )}
      </PhotoFullscreen>
    </>
  );
}
