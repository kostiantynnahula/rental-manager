'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { applyApiError } from '@/lib/api/api-error';
import { useUpdateMeter, type Meter } from '@/lib/api/queries/meters';

const schema = z.object({
  label: z.string().trim().max(100, 'Не більше 100 символів'),
  serialNumber: z.string().trim().max(100, 'Не більше 100 символів'),
  notes: z.string().trim(),
});
type Values = z.infer<typeof schema>;

// Label, serial number, notes → PATCH (null clears).
export function EditMeterForm({ meter, onDone }: { meter: Meter; onDone: () => void }) {
  const update = useUpdateMeter(meter.id);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: meter.label ?? '',
      serialNumber: meter.serialNumber ?? '',
      notes: meter.notes ?? '',
    },
  });

  async function onSubmit(v: Values) {
    try {
      // null clears a field.
      await update.mutateAsync({
        label: v.label || null,
        serialNumber: v.serialNumber || null,
        notes: v.notes || null,
      });
      toast.success('Лічильник збережено');
      onDone();
    } catch (error) {
      applyApiError(error);
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="label"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="meter-edit-label">Назва</FieldLabel>
              <Input
                {...field}
                id="meter-edit-label"
                placeholder="напр. кухня"
                maxLength={100}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="serialNumber"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="meter-edit-serial">Серійний номер</FieldLabel>
              <Input
                {...field}
                id="meter-edit-serial"
                maxLength={100}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="notes"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="meter-edit-notes">Нотатки</FieldLabel>
              <Textarea {...field} id="meter-edit-notes" rows={3} />
            </Field>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Збереження…' : 'Зберегти'}
        </Button>
      </FieldGroup>
    </form>
  );
}
