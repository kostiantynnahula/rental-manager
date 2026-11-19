'use client';

import { Camera } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormSheet } from '@/components/form-sheet';
import { Button } from '@/components/ui/button';
import {
  useUploadConditionPhotos,
  type UploadConditionPhotosInput,
} from '@/lib/api/queries/condition-photos';
import type { LeaseDates } from './interfaces/lease-dates.interface';
import { uploadErrorMessage } from './helpers/upload-error-message';
import { UploadConditionPhotosForm } from './upload-condition-photos-form';

interface UploadConditionPhotosSheetProps {
  apartmentId: string;
  // Lease page: event/date defaults and the out-of-lease hint.
  lease?: LeaseDates;
}

// "Додати фото стану" → a sheet. On an error it stays open: sending the same files again is safe
// (already stored ones come back as duplicates).
export function UploadConditionPhotosSheet({
  apartmentId,
  lease,
}: UploadConditionPhotosSheetProps) {
  const [open, setOpen] = useState(false);
  const upload = useUploadConditionPhotos(apartmentId);

  function submit(input: UploadConditionPhotosInput) {
    upload.mutate(input, {
      onSuccess: (results) => {
        const added = results.filter((r) => !r.duplicate).length;
        const duplicates = results.length - added;
        if (added > 0) toast.success(`Завантажено фото: ${added}`);
        if (duplicates > 0) {
          toast.info(
            duplicates === 1 ? 'Це фото вже завантажене' : `Вже завантажені раніше: ${duplicates}`,
          );
        }
        setOpen(false);
      },
      onError: (error) => toast.error(uploadErrorMessage(error)),
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Camera />
        Додати фото стану
      </Button>
      <FormSheet
        open={open}
        // Not closable mid-upload: the remaining chunks would still be sent.
        onOpenChange={(next) => !upload.isPending && setOpen(next)}
        title="Фото стану квартири"
        description="Одна подія, дата і примітка для всіх вибраних фото."
      >
        {/* Mounted only while open: fresh defaults (today) every time. */}
        {open && (
          <UploadConditionPhotosForm lease={lease} pending={upload.isPending} onSubmit={submit} />
        )}
      </FormSheet>
    </>
  );
}
