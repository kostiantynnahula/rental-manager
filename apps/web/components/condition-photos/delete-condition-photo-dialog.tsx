'use client';

import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { applyApiError } from '@/lib/api/api-error';
import { useDeleteConditionPhoto, type ConditionPhoto } from '@/lib/api/queries/condition-photos';

interface DeleteConditionPhotoDialogProps {
  photo: ConditionPhoto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The photo's own page leaves after a delete.
  onDeleted?: () => void;
}

// Always allowed by the API; the original is deleted too.
export function DeleteConditionPhotoDialog({
  photo,
  open,
  onOpenChange,
  onDeleted,
}: DeleteConditionPhotoDialogProps) {
  const remove = useDeleteConditionPhoto(photo.id);

  function confirm() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success('Фото видалено');
        onDeleted?.();
      },
      onError: (error) => applyApiError(error, { messages: { 404: 'Фото вже видалено' } }),
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
