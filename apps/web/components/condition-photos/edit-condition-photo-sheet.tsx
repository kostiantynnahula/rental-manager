'use client';

import { FormSheet } from '@/components/form-sheet';
import type { ConditionPhoto } from '@/lib/api/queries/condition-photos';
import { EditConditionPhotoForm } from './edit-condition-photo-form';

interface EditConditionPhotoSheetProps {
  photo: ConditionPhoto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditConditionPhotoSheet({
  photo,
  open,
  onOpenChange,
}: EditConditionPhotoSheetProps) {
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Редагувати фото">
      {/* Mounted only while open: a fresh form with current values every time. */}
      {open && <EditConditionPhotoForm photo={photo} onDone={() => onOpenChange(false)} />}
    </FormSheet>
  );
}
