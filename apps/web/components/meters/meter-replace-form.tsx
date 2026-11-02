'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { applyApiError, type FieldErrorRule } from '@/lib/api/api-error';
import { useReplaceMeter, type Meter } from '@/lib/api/queries/meters';
import { formatDate, todayDateOnly } from '@/lib/format';
import { zoneSchemesFor, type ZoneScheme } from '@/lib/utilities';
import { DATE_BEFORE_LAST, DATE_IN_FUTURE, LOWER_THAN_LAST } from './constants/server-errors';
import { emptyValues } from './helpers/empty-values';
import { toReadingValuesInput } from './helpers/reading-values-schema';
import { replaceMeterSchema, type ReplaceMeterValues } from './helpers/replace-meter-schema';
import { ReadingValuesInput } from './reading-values-input';
import { ZoneSchemeField } from './zone-scheme-field';

const SERVER_ERRORS: FieldErrorRule<ReplaceMeterValues>[] = [
  {
    status: 400,
    bodyIncludes: LOWER_THAN_LAST,
    field: 'finalValues.0.value',
    message: 'Менше за попереднє показання',
  },
  {
    status: 400,
    bodyIncludes: DATE_BEFORE_LAST,
    field: 'date',
    message: 'Не раніше останнього показання',
  },
  {
    status: 400,
    bodyIncludes: DATE_IN_FUTURE,
    field: 'date',
    message: 'Не може бути в майбутньому',
  },
];

// Old meter: FINAL + removed on `date`; new meter: installed on the same date with an INITIAL reading. One request.
export function MeterReplaceForm({ meter }: { meter: Meter }) {
  const router = useRouter();
  const replace = useReplaceMeter(meter.id);
  const [saved, setSaved] = useState(false);
  const back = `/apartments/${meter.apartmentId}?tab=meters`;
  const schema = useMemo(() => replaceMeterSchema(meter), [meter]);

  const form = useForm<ReplaceMeterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayDateOnly(),
      finalValues: emptyValues(meter.zoneScheme),
      zoneScheme: meter.zoneScheme,
      label: meter.label ?? '',
      serialNumber: '',
      initialValues: emptyValues(meter.zoneScheme),
    },
  });
  const { isDirty, isSubmitting } = form.formState;
  const { confirmLeave, allowLeave, dialog } = useUnsavedChanges(isDirty && !saved);
  const [date, zoneScheme] = useWatch({ control: form.control, name: ['date', 'zoneScheme'] });
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);

  function setZoneScheme(scheme: ZoneScheme) {
    if (scheme === form.getValues('zoneScheme')) return;
    form.setValue('zoneScheme', scheme, { shouldDirty: true });
    form.setValue('initialValues', emptyValues(scheme), { shouldDirty: true });
  }

  async function onSubmit(v: ReplaceMeterValues) {
    try {
      await replace.mutateAsync({
        date: v.date,
        finalValues: toReadingValuesInput(v.finalValues),
        newMeter: {
          zoneScheme: v.zoneScheme,
          initialValues: toReadingValuesInput(v.initialValues),
          ...(v.label && { label: v.label }),
          ...(v.serialNumber && { serialNumber: v.serialNumber }),
        },
      });
      setSaved(true);
      allowLeave();
      toast.success('Лічильник замінено');
      router.push(back);
    } catch (error) {
      applyApiError(error, {
        setError: form.setError,
        fields: SERVER_ERRORS,
        messages: { 409: 'Лічильник уже знято або квартиру архівовано' },
      });
    }
  }

  const busy = isSubmitting || saved;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl">
      <FieldGroup>
        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="meter-replace-date">Дата заміни</FieldLabel>
              <Input
                {...field}
                id="meter-replace-date"
                type="date"
                min={meter.lastReading?.readingDate}
                max={todayDateOnly()}
                className="sm:max-w-48"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <FieldSet>
          <FieldLegend>Старий лічильник — кінцеві показання</FieldLegend>
          <ReadingValuesInput
            control={form.control}
            name="finalValues"
            zoneScheme={meter.zoneScheme}
            utility={meter.utility}
            previous={meter.lastReading?.values}
            idPrefix="meter-replace-final"
          />
        </FieldSet>

        <FieldSet>
          <FieldLegend>Новий лічильник</FieldLegend>
          {zoneSchemesFor(meter.utility).length > 1 && (
            <ZoneSchemeField
              value={zoneScheme}
              onChange={setZoneScheme}
              idPrefix="meter-replace-scheme"
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="label"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="meter-replace-label">Назва</FieldLabel>
                  <Input
                    {...field}
                    id="meter-replace-label"
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
                  <FieldLabel htmlFor="meter-replace-serial">Серійний номер</FieldLabel>
                  <Input
                    {...field}
                    id="meter-replace-serial"
                    maxLength={100}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Початкові показання</p>
            <ReadingValuesInput
              key={zoneScheme}
              control={form.control}
              name="initialValues"
              zoneScheme={zoneScheme}
              utility={meter.utility}
              idPrefix="meter-replace-initial"
            />
          </div>
        </FieldSet>

        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border bg-muted px-4 py-3 text-sm"
        >
          <Info className="mt-0.5 size-4 shrink-0" />
          {validDate
            ? `Старий лічильник буде знято, новий встановлено з ${formatDate(date)}.`
            : 'Вкажіть дату заміни.'}
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => confirmLeave(() => router.push(back))}
            disabled={busy}
          >
            Скасувати
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Збереження…' : 'Замінити лічильник'}
          </Button>
        </div>
      </FieldGroup>
      {dialog}
    </form>
  );
}
