'use client';

import { ImagePlus, Loader2 } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUploadPhotos } from '@/lib/api/queries/photos';
import { PHOTO_ACCEPT } from './constants/upload';
import { uploadErrorMessage } from './helpers/upload-error-message';

// A plain file input behind a button: on a phone it opens the gallery, several photos at once.
export function UploadPhotosButton({ apartmentId }: { apartmentId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadPhotos(apartmentId);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset so picking the same file again still fires onChange.
    event.target.value = '';
    if (files.length === 0) return;
    upload.mutate(files, {
      onSuccess: (results) => {
        const added = results.filter((r) => !r.duplicate).length;
        const duplicates = results.length - added;
        if (added > 0) toast.success(`Завантажено фото: ${added}`);
        // Not an error: the existing record is returned and nothing is stored twice.
        if (duplicates > 0) {
          toast.info(
            duplicates === 1 ? 'Це фото вже завантажене' : `Вже завантажені раніше: ${duplicates}`,
          );
        }
      },
      onError: (error) => toast.error(uploadErrorMessage(error)),
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={PHOTO_ACCEPT}
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
        className="w-full sm:w-auto"
      >
        {upload.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        {upload.isPending ? 'Завантаження…' : 'Завантажити фото'}
      </Button>
    </>
  );
}
