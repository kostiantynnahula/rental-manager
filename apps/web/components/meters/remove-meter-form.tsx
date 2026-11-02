'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { applyApiError, type FieldErrorRule } from '@/lib/api/api-error';
import { useRemoveMeter, type Meter } from '@/lib/api/queries/meters';
import { todayDateOnly } from '@/lib/format';
import { DATE_BEFORE_LAST, DATE_IN_FUTURE, LOWER_THAN_LAST } from './constants/server-errors';
import { emptyValues } from './helpers/empty-values';
import { toReadingValuesInput } from './helpers/reading-values-schema';
import { removeMeterSchema, type RemoveMeterValues as Values } from './helpers/remove-meter-schema';
import { ReadingValuesInput } from './reading-values-input';

// "Зняти": FINAL reading (not lower than the last confirmed one) + removedAt, in one request.
export function RemoveMeterForm({ meter, onDone }: { meter: Meter; onDone: () => void }) {
  const remove = useRemoveMeter(meter.id);
  const last = meter.lastReading;
  const minDate = last?.readingDate;

  const schema = useMemo(() => removeMeterSchema(last), [last]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { removedAt: todayDateOnly(), finalValues: emptyValues(meter.zoneScheme) },
  });

  const serverErrors: FieldErrorRule<Values>[] = [
    {
      status: 400,
      bodyIncludes: LOWER_THAN_LAST,
      field: 'finalValues.0.value',
      message: 'Менше за попереднє показання',
    },
    {
      status: 400,
      bodyIncludes: DATE_BEFORE_LAST,
      field: 'removedAt',
      message: 'Не раніше останнього показання',
    },
    {
      status: 400,
      bodyIncludes: DATE_IN_FUTURE,
      field: 'removedAt',
      message: 'Не може бути в майбутньому',
    },
  ];

  async function onSubmit(v: Values) {
    try {
      await remove.mutateAsync({
        removedAt: v.removedAt,
        finalValues: toReadingValuesInput(v.finalValues),
      });
      toast.success('Лічильник знято');
      onDone();
    } catch (error) {
      applyApiError(error, {
        setError: form.setError,
        fields: serverErrors,
        messages: { 409: 'Лічильник уже знято' },
      });
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="removedAt"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="meter-remove-date">Дата зняття</FieldLabel>
              <Input
                {...field}
                id="meter-remove-date"
                type="date"
                min={minDate}
                max={todayDateOnly()}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Кінцеві показання</p>
          <ReadingValuesInput
            control={form.control}
            name="finalValues"
            zoneScheme={meter.zoneScheme}
            utility={meter.utility}
            previous={last?.values}
            idPrefix="meter-remove"
          />
        </div>
        <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Збереження…' : 'Зняти лічильник'}
        </Button>
      </FieldGroup>
    </form>
  );
}
