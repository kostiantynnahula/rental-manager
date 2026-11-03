'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useResetAfterSave } from '@/hooks/use-reset-after-save';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { applyApiError, type FieldErrorRule } from '@/lib/api/api-error';
import {
  useCreateApartment,
  useUpdateApartment,
  type Apartment,
} from '@/lib/api/queries/apartments';

// Same limits as CreateApartmentDto (name ≤ 100, address required).
const apartmentSchema = z.object({
  name: z.string().trim().min(1, 'Вкажіть назву').max(100, 'Не більше 100 символів'),
  address: z.string().trim().min(1, 'Вкажіть адресу'),
  notes: z.string().trim(),
});

type ApartmentFormValues = z.infer<typeof apartmentSchema>;

const SERVER_FIELD_ERRORS: FieldErrorRule<ApartmentFormValues>[] = [
  { status: 409, field: 'name', message: 'Квартира з такою назвою вже існує' },
];

// Create when `apartment` is undefined, edit otherwise.
export function ApartmentForm({ apartment }: { apartment?: Apartment }) {
  const router = useRouter();
  const create = useCreateApartment();
  const update = useUpdateApartment(apartment?.id ?? '');
  // Keeps the button disabled after a successful save while the next page loads.
  const [saved, setSaved] = useState(false);

  const form = useForm<ApartmentFormValues>({
    resolver: zodResolver(apartmentSchema),
    defaultValues: {
      name: apartment?.name ?? '',
      address: apartment?.address ?? '',
      notes: apartment?.notes ?? '',
    },
  });
  const { isDirty, isSubmitting } = form.formState;
  const { confirmLeave, allowLeave, dialog } = useUnsavedChanges(isDirty && !saved);
  // The page stays mounted (hidden) after navigating away. Next visit: create starts empty, edit shows what
  // was just saved (not the values from before the edit).
  const [lastSaved, setLastSaved] = useState<ApartmentFormValues | null>(null);
  const markSaved = useResetAfterSave(() => {
    form.reset(apartment && lastSaved ? lastSaved : { name: '', address: '', notes: '' });
    setSaved(false);
  });

  async function onSubmit({ name, address, notes }: ApartmentFormValues) {
    try {
      const result = apartment
        ? // null clears the notes; create simply omits them.
          await update.mutateAsync({ name, address, notes: notes || null })
        : await create.mutateAsync({ name, address, ...(notes && { notes }) });
      setSaved(true);
      setLastSaved({ name, address, notes });
      markSaved();
      allowLeave();
      toast.success('Квартиру збережено');
      router.push(`/apartments/${result.id}`);
    } catch (error) {
      applyApiError(error, { setError: form.setError, fields: SERVER_FIELD_ERRORS });
    }
  }

  function cancel() {
    confirmLeave(() => {
      // Opened directly (no history in this tab) → go to a sensible parent instead of leaving the app.
      if (window.history.length > 1) router.back();
      else router.push(apartment ? `/apartments/${apartment.id}` : '/');
    });
  }

  const busy = isSubmitting || saved;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="apartment-name">Назва</FieldLabel>
              <Input
                {...field}
                id="apartment-name"
                placeholder="Шевченка 12/5"
                maxLength={100}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="address"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="apartment-address">Адреса</FieldLabel>
              <Input
                {...field}
                id="apartment-address"
                placeholder="Київ, вул. Шевченка, 12, кв. 5"
                autoComplete="street-address"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="notes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="apartment-notes">Нотатки</FieldLabel>
              <Textarea
                {...field}
                id="apartment-notes"
                rows={4}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
            Скасувати
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Збереження…' : 'Зберегти'}
          </Button>
        </div>
      </FieldGroup>
      {dialog}
    </form>
  );
}
