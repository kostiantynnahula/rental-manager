'use client';

import { Controller, type Control } from 'react-hook-form';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { todayDateOnly } from '@/lib/format';
import { NOTE_MAX_LENGTH } from './constants/note';
import { EventChoice } from './event-choice';
import type { ConditionPhotoValues } from './helpers/condition-photo-schema';

// Event, date, note — the same fields in the upload and edit forms.
export function ConditionPhotoFields({
  control,
  idPrefix,
}: {
  control: Control<ConditionPhotoValues>;
  idPrefix: string;
}) {
  return (
    <>
      <Controller
        name="event"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel id={`${idPrefix}-event`}>Подія</FieldLabel>
            <EventChoice
              value={field.value}
              onChange={field.onChange}
              labelId={`${idPrefix}-event`}
            />
          </Field>
        )}
      />
      <Controller
        name="takenOn"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-date`}>Дата зйомки</FieldLabel>
            <Input
              {...field}
              id={`${idPrefix}-date`}
              type="date"
              max={todayDateOnly()}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="note"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-note`}>Примітка</FieldLabel>
            <Textarea
              {...field}
              id={`${idPrefix}-note`}
              rows={3}
              maxLength={NOTE_MAX_LENGTH}
              placeholder="напр. подряпина на дверцятах шафи"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </>
  );
}
