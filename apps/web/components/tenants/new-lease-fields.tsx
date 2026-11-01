import { Controller, type Control } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { TenantFormValues } from './helpers/tenant-form-schema';

// Lease fields for an apartment without a current lease (assignment mode NEW_LEASE).
export function NewLeaseFields({
  control,
  idPrefix,
}: {
  control: Control<TenantFormValues>;
  idPrefix: string;
}) {
  const id = (name: string) => `${idPrefix}-lease-${name}`;
  return (
    <>
      <p className="rounded-lg border bg-muted px-4 py-3 text-sm" role="status">
        Буде створено новий договір, мешканець — основний.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="assignment.startDate"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id('start')}>Дата початку</FieldLabel>
              <Input {...field} id={id('start')} type="date" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="assignment.rent"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id('rent')}>Орендна плата, грн / міс.</FieldLabel>
              <Input
                {...field}
                id={id('rent')}
                inputMode="decimal"
                placeholder="15000"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
      <Controller
        name="assignment.notes"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id('notes')}>Нотатки до договору</FieldLabel>
            <Textarea {...field} id={id('notes')} rows={3} aria-invalid={fieldState.invalid} />
            <FieldDescription>Договір безстроковий; завершити його можна пізніше.</FieldDescription>
          </Field>
        )}
      />
    </>
  );
}
