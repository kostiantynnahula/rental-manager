'use client';

import { Controller, type Control } from 'react-hook-form';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { LeaseTermsValues } from './helpers/lease-terms-schema';

interface LeaseTermsFieldsProps<T extends LeaseTermsValues> {
  control: Control<T>;
  idPrefix: string;
  // Shown under the rent field (e.g. the "affects all months" warning when editing).
  rentWarning?: React.ReactNode;
}

// Start/end date, monthly rent (UAH), notes — for any form whose values contain LeaseTermsValues.
export function LeaseTermsFields<T extends LeaseTermsValues>({
  control,
  idPrefix,
  rentWarning,
}: LeaseTermsFieldsProps<T>) {
  // Safe: T has every LeaseTermsValues field at the top level.
  const c = control as unknown as Control<LeaseTermsValues>;
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="startDate"
          control={c}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id('start')}>Дата початку</FieldLabel>
              <Input {...field} id={id('start')} type="date" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="endDate"
          control={c}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id('end')}>Дата завершення</FieldLabel>
              <Input {...field} id={id('end')} type="date" aria-invalid={fieldState.invalid} />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Порожньо — безстроковий (останній день включно)
                </p>
              )}
            </Field>
          )}
        />
      </div>
      <Controller
        name="rent"
        control={c}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id('rent')}>Орендна плата, грн / міс.</FieldLabel>
            <Input
              {...field}
              id={id('rent')}
              inputMode="decimal"
              placeholder="15000"
              className="sm:max-w-48"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            {rentWarning}
          </Field>
        )}
      />
      <Controller
        name="notes"
        control={c}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id('notes')}>Нотатки</FieldLabel>
            <Textarea {...field} id={id('notes')} rows={3} aria-invalid={fieldState.invalid} />
          </Field>
        )}
      />
    </>
  );
}
