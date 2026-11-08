'use client';

import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { applyApiError } from '@/lib/api/api-error';
import { useDeletePhoto, type Photo } from '@/lib/api/queries/photos';
import { PHOTO_IN_USE_REASON } from './constants/messages';

interface DeletePhotoDialogProps {
  photo: Photo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// For a junk photo; the API allows it only while no non-cancelled reading uses it.
export function DeletePhotoDialog({ photo, open, onOpenChange }: DeletePhotoDialogProps) {
  const remove = useDeletePhoto(photo.id);

  function confirm() {
    remove.mutate(undefined, {
      onSuccess: () => toast.success('Фото видалено'),
      onError: (error) => applyApiError(error, { messages: { 409: PHOTO_IN_USE_REASON } }),
      onSettled: () => onOpenChange(false),
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Видалити фото?"
      description="Фото буде видалено назавжди."
      confirmLabel="Видалити"
      destructive
      pending={remove.isPending}
      onConfirm={confirm}
    />
  );
}
