'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { applyApiError, type FieldErrorRule } from '@/lib/api/api-error';
import { useEndApartmentTariff, type ApartmentTariff } from '@/lib/api/queries/apartment-tariffs';
import { formatPeriod, todayDateOnly } from '@/lib/format';
import { isPeriod } from '@/lib/period';
import { END_BEFORE_START } from './constants/server-errors';

type Values = { activeTo: string };

// Last billed month; "YYYY-MM" strings compare correctly as text.
function endSchema(activeFrom: string) {
  return z.object({
    activeTo: z
      .string()
      .refine(isPeriod, 'Вкажіть місяць')
      .refine((v) => v >= activeFrom, `Не раніше ${formatPeriod(activeFrom)}`),
  });
}

export function EndApartmentTariffForm({
  apartmentId,
  attachment,
  onDone,
}: {
  apartmentId: string;
  attachment: ApartmentTariff;
  onDone: () => void;
}) {
  const end = useEndApartmentTariff(apartmentId);
  const thisMonth = todayDateOnly().slice(0, 7);
  const form = useForm<Values>({
    resolver: zodResolver(endSchema(attachment.activeFrom)),
    defaultValues: {
      activeTo:
        attachment.activeTo ??
        (thisMonth >= attachment.activeFrom ? thisMonth : attachment.activeFrom),
    },
  });
  const serverErrors: FieldErrorRule<Values>[] = [
    {
      status: 400,
      bodyIncludes: END_BEFORE_START,
      field: 'activeTo',
      message: `Не раніше ${formatPeriod(attachment.activeFrom)}`,
    },
  ];

  async function onSubmit(v: Values) {
    try {
      await end.mutateAsync({ id: attachment.id, activeTo: v.activeTo });
      toast.success('Тариф відключено');
      onDone();
    } catch (error) {
      applyApiError(error, { setError: form.setError, fields: serverErrors });
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
          name="activeTo"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="end-tariff-to">Останній місяць</FieldLabel>
              <Input
                {...field}
                id="end-tariff-to"
                type="month"
                min={attachment.activeFrom}
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Цей місяць ще рахується; з наступного тариф не застосовується. Історія зберігається.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Збереження…' : 'Відключити'}
        </Button>
      </FieldGroup>
    </form>
  );
}
