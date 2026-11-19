'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { applyApiError } from '@/lib/api/api-error';
import {
  useUpdateConditionPhoto,
  type ConditionPhoto,
  type UpdateConditionPhotoInput,
} from '@/lib/api/queries/condition-photos';
import { ConditionPhotoFields } from './condition-photo-fields';
import { conditionPhotoSchema, type ConditionPhotoValues } from './helpers/condition-photo-schema';

// Event, date, note → PATCH with only the changed fields (a cleared note = null).
export function EditConditionPhotoForm({
  photo,
  onDone,
}: {
  photo: ConditionPhoto;
  onDone: () => void;
}) {
  const update = useUpdateConditionPhoto(photo.id);
  const form = useForm<ConditionPhotoValues>({
    resolver: zodResolver(conditionPhotoSchema),
    defaultValues: { event: photo.event, takenOn: photo.takenOn, note: photo.note ?? '' },
  });

  async function onSubmit(v: ConditionPhotoValues) {
    const body: UpdateConditionPhotoInput = {};
    if (v.event !== photo.event) body.event = v.event;
    if (v.takenOn !== photo.takenOn) body.takenOn = v.takenOn;
    if ((v.note || null) !== photo.note) body.note = v.note || null;
    if (Object.keys(body).length === 0) return onDone();
    try {
      await update.mutateAsync(body);
      toast.success('Збережено');
      onDone();
    } catch (error) {
      applyApiError(error, { messages: { 404: 'Фото вже видалено' } });
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <ConditionPhotoFields control={form.control} idPrefix={`condition-edit-${photo.id}`} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Збереження…' : 'Зберегти'}
        </Button>
      </FieldGroup>
    </form>
  );
}
