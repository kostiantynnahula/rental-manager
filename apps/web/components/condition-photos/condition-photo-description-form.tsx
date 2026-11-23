'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useResetAfterSave } from '@/hooks/use-reset-after-save';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { applyApiError } from '@/lib/api/api-error';
import {
  useUpdateConditionPhoto,
  type ConditionPhotoDetail,
} from '@/lib/api/queries/condition-photos';
import { formatInstantDate } from '@/lib/format';
import {
  DESCRIPTION_ITEM_CONDITION_MAX_LENGTH,
  DESCRIPTION_ITEM_NAME_MAX_LENGTH,
  DESCRIPTION_MAX_ITEMS,
  DESCRIPTION_SUMMARY_MAX_LENGTH,
  ROOM_OPTIONS,
} from './constants/description';
import { descriptionSchema, type DescriptionValues } from './helpers/description-schema';
import { descriptionToValues } from './helpers/description-to-values';
import { valuesToDescription } from './helpers/values-to-description';

const ERROR_MESSAGES = {
  404: 'Фото вже видалено',
  409: 'Опис змінився, поки ви редагували. Оновіть сторінку',
};

// Room, summary and items → PATCH { description } (replaces it as a whole, re-indexed for search).
// An edited description can be restored to the model's → PATCH { description: null }.
// Keyed by ConditionPhotoDescriptionSection, which remounts it with fresh defaults only while it isn't dirty.
export function ConditionPhotoDescriptionForm({
  photo,
  onDirtyChange,
}: {
  photo: ConditionPhotoDetail;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const update = useUpdateConditionPhoto(photo.id);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const idPrefix = `condition-description-${photo.id}`;
  const form = useForm<DescriptionValues>({
    resolver: zodResolver(descriptionSchema),
    defaultValues: descriptionToValues(photo.description),
  });
  const items = useFieldArray({ control: form.control, name: 'items' });
  const { isDirty, isSubmitting } = form.formState;
  const { dialog } = useUnsavedChanges(isDirty);

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);
  // Hidden by navigation right after a save: come back to the saved values, not a stale "dirty" form.
  const markSaved = useResetAfterSave(() => form.reset(form.getValues()));

  async function onSubmit(values: DescriptionValues) {
    try {
      await update.mutateAsync({ description: valuesToDescription(values) });
      form.reset(values);
      markSaved();
      toast.success('Збережено');
    } catch (error) {
      applyApiError(error, { messages: ERROR_MESSAGES });
    }
  }

  function restore() {
    update.mutate(
      { description: null },
      {
        onSuccess: () => {
          // Drop the draft: a dirty form isn't remounted, and the restored description must show.
          form.reset();
          toast.success('Повернуто опис моделі');
        },
        onError: (error) => applyApiError(error, { messages: ERROR_MESSAGES }),
        onSettled: () => setConfirmRestore(false),
      },
    );
  }

  const canRestore = photo.descriptionEditedAt !== null && photo.generatedDescription !== null;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Опис</h2>
        {photo.descriptionEditedAt ? (
          <p className="text-sm text-muted-foreground">
            Змінено вручну · {formatInstantDate(photo.descriptionEditedAt)}
          </p>
        ) : (
          photo.description === null && (
            <p className="text-sm text-muted-foreground">
              Моделі ще немає опису — можна описати вручну.
            </p>
          )
        )}
        {canRestore && (
          <Button
            type="button"
            variant="outline"
            className="mt-1"
            onClick={() => setConfirmRestore(true)}
          >
            Повернути опис моделі
          </Button>
        )}
      </div>
      <FieldGroup>
        <Controller
          name="room"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-room`}>Кімната</FieldLabel>
              <NativeSelect {...field} id={`${idPrefix}-room`}>
                {ROOM_OPTIONS.map((room) => (
                  <option key={room.value} value={room.value}>
                    {room.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
        />
        <Controller
          name="summary"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${idPrefix}-summary`}>Що на фото</FieldLabel>
              <Textarea
                {...field}
                id={`${idPrefix}-summary`}
                rows={3}
                maxLength={DESCRIPTION_SUMMARY_MAX_LENGTH}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Предмети</p>
          {items.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">Немає предметів</p>
          )}
          <ul className="space-y-2">
            {items.fields.map((item, index) => (
              <li key={item.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-end gap-2">
                  <Controller
                    name={`items.${index}.name`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="min-w-0 flex-1">
                        <FieldLabel htmlFor={`${idPrefix}-item-${item.id}-name`}>Назва</FieldLabel>
                        <Input
                          {...field}
                          id={`${idPrefix}-item-${item.id}-name`}
                          maxLength={DESCRIPTION_ITEM_NAME_MAX_LENGTH}
                          placeholder="напр. холодильник"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Видалити предмет ${index + 1}`}
                    onClick={() => items.remove(index)}
                    className="shrink-0"
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Controller
                    name={`items.${index}.count`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="w-24 shrink-0">
                        <FieldLabel htmlFor={`${idPrefix}-item-${item.id}-count`}>
                          Кількість
                        </FieldLabel>
                        <Input
                          {...field}
                          id={`${idPrefix}-item-${item.id}-count`}
                          inputMode="numeric"
                          placeholder="1"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    name={`items.${index}.condition`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="min-w-0 flex-1">
                        <FieldLabel htmlFor={`${idPrefix}-item-${item.id}-condition`}>
                          Стан
                        </FieldLabel>
                        <Input
                          {...field}
                          id={`${idPrefix}-item-${item.id}-condition`}
                          maxLength={DESCRIPTION_ITEM_CONDITION_MAX_LENGTH}
                          placeholder="напр. подряпина"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>
              </li>
            ))}
          </ul>
          {form.formState.errors.items?.root && (
            <FieldError errors={[form.formState.errors.items.root]} />
          )}
          <Button
            type="button"
            variant="outline"
            disabled={items.fields.length >= DESCRIPTION_MAX_ITEMS}
            onClick={() => items.append({ name: '', count: '', condition: '' })}
          >
            <Plus />
            Додати предмет
          </Button>
        </div>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Збереження…' : 'Зберегти опис'}
        </Button>
      </FieldGroup>
      <ConfirmDialog
        open={confirmRestore}
        onOpenChange={setConfirmRestore}
        title="Повернути опис моделі?"
        description="Ваші зміни опису буде втрачено."
        confirmLabel="Повернути"
        destructive
        pending={update.isPending}
        onConfirm={restore}
      />
      {dialog}
    </form>
  );
}
