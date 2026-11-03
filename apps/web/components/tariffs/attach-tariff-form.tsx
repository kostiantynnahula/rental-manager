'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { applyApiError, type FieldErrorRule } from '@/lib/api/api-error';
import { useAttachTariff } from '@/lib/api/queries/apartment-tariffs';
import type { Tariff } from '@/lib/api/queries/tariffs';
import { todayDateOnly } from '@/lib/format';
import { isPeriod } from '@/lib/period';
import { ATTACHMENT_OVERLAP, IS_ARCHIVED } from './constants/server-errors';
import { TariffSearchCombobox } from './tariff-search-combobox';

const schema = z.object({
  tariffId: z.string().min(1, 'Оберіть тариф'),
  activeFrom: z.string().refine(isPeriod, 'Вкажіть місяць'),
});
type Values = z.infer<typeof schema>;

const SERVER_FIELD_ERRORS: FieldErrorRule<Values>[] = [
  {
    status: 409,
    bodyIncludes: ATTACHMENT_OVERLAP,
    field: 'activeFrom',
    message: 'Цей тариф уже підключено на ці місяці',
  },
  { status: 409, bodyIncludes: IS_ARCHIVED, field: 'tariffId', message: 'Тариф в архіві' },
];

interface AttachTariffFormProps {
  apartmentId: string;
  // Attached now: not offered again.
  attachedTariffIds: string[];
  onDone: () => void;
}

export function AttachTariffForm({
  apartmentId,
  attachedTariffIds,
  onDone,
}: AttachTariffFormProps) {
  const attach = useAttachTariff(apartmentId);
  // The picked tariff for the trigger label; the form only holds its id.
  const [tariff, setTariff] = useState<Tariff | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { tariffId: '', activeFrom: todayDateOnly().slice(0, 7) },
  });

  async function onSubmit(v: Values) {
    try {
      await attach.mutateAsync(v);
      toast.success('Тариф підключено');
      onDone();
    } catch (error) {
      applyApiError(error, { setError: form.setError, fields: SERVER_FIELD_ERRORS });
    }
  }

  return (
    // stopPropagation: the sheet is portalled, but React still bubbles submit to an outer form.
    <form
      noValidate
      onSubmit={(e) => {
        e.stopPropagation();
        void form.handleSubmit(onSubmit)(e);
      }}
    >
      <FieldGroup>
        <Controller
          name="tariffId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="attach-tariff">Тариф</FieldLabel>
              <TariffSearchCombobox
                id="attach-tariff"
                value={tariff}
                onChange={(picked) => {
                  setTariff(picked);
                  field.onChange(picked.id);
                }}
                excludeIds={attachedTariffIds}
                invalid={fieldState.invalid}
              />
              <FieldDescription>
                Немає потрібного?{' '}
                <Link href={`/tariffs/new?apartmentId=${apartmentId}`} className="underline">
                  Створити тариф
                </Link>
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="activeFrom"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="attach-tariff-from">Діє з</FieldLabel>
              <Input
                {...field}
                id="attach-tariff-from"
                type="month"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>Перший місяць, за який рахується тариф</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Збереження…' : 'Підключити'}
        </Button>
      </FieldGroup>
    </form>
  );
}
