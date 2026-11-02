'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { applyApiError, type FieldErrorRule } from '@/lib/api/api-error';
import type { Apartment } from '@/lib/api/queries/apartments';
import { useCreateMeter } from '@/lib/api/queries/meters';
import { todayDateOnly } from '@/lib/format';
import {
  UTILITY_LABELS,
  UTILITY_ORDER,
  zoneSchemesFor,
  type UtilityType,
  type ZoneScheme,
} from '@/lib/utilities';
import { DATE_IN_FUTURE } from './constants/server-errors';
import { emptyValues } from './helpers/empty-values';
import { meterCreateSchema, type MeterCreateValues } from './helpers/meter-create-schema';
import { toReadingValuesInput } from './helpers/reading-values-schema';
import { ReadingValuesInput } from './reading-values-input';
import { ZoneSchemeField } from './zone-scheme-field';

const SERVER_ERRORS: FieldErrorRule<MeterCreateValues>[] = [
  {
    status: 400,
    bodyIncludes: DATE_IN_FUTURE,
    field: 'installedAt',
    message: 'Не може бути в майбутньому',
  },
];

// New meter + its INITIAL reading (confirmed right away: you read the meter yourself).
export function MeterCreateForm({ apartment }: { apartment: Apartment }) {
  const router = useRouter();
  const create = useCreateMeter(apartment.id);
  const [saved, setSaved] = useState(false);
  const back = `/apartments/${apartment.id}?tab=meters`;

  const form = useForm<MeterCreateValues>({
    resolver: zodResolver(meterCreateSchema),
    defaultValues: {
      utility: 'ELECTRICITY',
      zoneScheme: 'SINGLE',
      label: '',
      serialNumber: '',
      installedAt: todayDateOnly(),
      initialValues: emptyValues('SINGLE'),
    },
  });
  const { isDirty, isSubmitting } = form.formState;
  const { confirmLeave, allowLeave, dialog } = useUnsavedChanges(isDirty && !saved);
  const [utility, zoneScheme] = useWatch({
    control: form.control,
    name: ['utility', 'zoneScheme'],
  });

  // The value inputs follow the zones of the scheme; changing it clears them.
  function setZoneScheme(scheme: ZoneScheme) {
    if (scheme === form.getValues('zoneScheme')) return;
    form.setValue('zoneScheme', scheme, { shouldDirty: true });
    form.setValue('initialValues', emptyValues(scheme), { shouldDirty: true });
  }

  function setUtility(next: UtilityType) {
    form.setValue('utility', next, { shouldDirty: true });
    // Water/gas have no day/night metering.
    if (!zoneSchemesFor(next).includes(form.getValues('zoneScheme'))) setZoneScheme('SINGLE');
  }

  async function onSubmit(v: MeterCreateValues) {
    try {
      await create.mutateAsync({
        utility: v.utility,
        zoneScheme: v.zoneScheme,
        installedAt: v.installedAt,
        initialValues: toReadingValuesInput(v.initialValues),
        ...(v.label && { label: v.label }),
        ...(v.serialNumber && { serialNumber: v.serialNumber }),
      });
      setSaved(true);
      allowLeave();
      toast.success('Лічильник додано');
      router.push(back);
    } catch (error) {
      applyApiError(error, {
        setError: form.setError,
        fields: SERVER_ERRORS,
        messages: { 409: 'Квартиру архівовано: новий лічильник додати не можна' },
      });
    }
  }

  const busy = isSubmitting || saved;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="meter-new-utility">Послуга</FieldLabel>
          <NativeSelect
            id="meter-new-utility"
            value={utility}
            onChange={(e) => setUtility(e.target.value as UtilityType)}
          >
            {UTILITY_ORDER.map((u) => (
              <option key={u} value={u}>
                {UTILITY_LABELS[u]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {zoneSchemesFor(utility).length > 1 && (
          <ZoneSchemeField
            value={zoneScheme}
            onChange={setZoneScheme}
            idPrefix="meter-new-scheme"
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="label"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="meter-new-label">Назва</FieldLabel>
                <Input
                  {...field}
                  id="meter-new-label"
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
                <FieldLabel htmlFor="meter-new-serial">Серійний номер</FieldLabel>
                <Input
                  {...field}
                  id="meter-new-serial"
                  maxLength={100}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
        <Controller
          name="installedAt"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="meter-new-date">Дата встановлення</FieldLabel>
              <Input
                {...field}
                id="meter-new-date"
                type="date"
                max={todayDateOnly()}
                className="sm:max-w-48"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Початкові показання</p>
          <ReadingValuesInput
            key={zoneScheme}
            control={form.control}
            name="initialValues"
            zoneScheme={zoneScheme}
            utility={utility}
            idPrefix="meter-new-initial"
          />
        </div>
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
            {busy ? 'Збереження…' : 'Додати лічильник'}
          </Button>
        </div>
      </FieldGroup>
      {dialog}
    </form>
  );
}
