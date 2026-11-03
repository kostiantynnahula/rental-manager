'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { applyApiError, type FieldErrorRule } from '@/lib/api/api-error';
import type { Apartment } from '@/lib/api/queries/apartments';
import {
  useOverrideApartmentTariff,
  type ApartmentTariff,
} from '@/lib/api/queries/apartment-tariffs';
import { formatPeriod, todayDateOnly } from '@/lib/format';
import { formatPrice, normalizePrice } from '@/lib/tariff-prices';
import { DUPLICATE_NAME, OUTSIDE_ATTACHMENT } from './constants/server-errors';
import { isZoned } from './helpers/is-zoned';
import { overrideTariffSchema, type OverrideTariffValues } from './helpers/override-tariff-schema';
import { priceUnit } from './helpers/price-unit';
import { PriceInput } from './price-input';

const SERVER_FIELD_ERRORS: FieldErrorRule<OverrideTariffValues>[] = [
  {
    status: 409,
    bodyIncludes: DUPLICATE_NAME,
    field: 'name',
    message: 'Тариф з такою назвою вже існує',
  },
  {
    status: 400,
    bodyIncludes: OUTSIDE_ATTACHMENT,
    field: 'effectiveFrom',
    message: 'Місяць поза періодом підключення',
  },
];

interface OverrideTariffFormProps {
  apartment: Apartment;
  attachment: ApartmentTariff;
  onDone: () => void;
}

// "Лише для цієї квартири": the API copies the shared tariff with these prices from the month on, ends the shared
// attachment the month before and attaches the copy — past months stay on the shared tariff.
export function OverrideTariffForm({ apartment, attachment, onDone }: OverrideTariffFormProps) {
  const override = useOverrideApartmentTariff(apartment.id);
  const tariff = attachment.tariff;
  const zoned = isZoned(tariff);
  const unit = priceUnit(tariff);
  const schema = useMemo(
    () => overrideTariffSchema(attachment.activeFrom, attachment.activeTo),
    [attachment.activeFrom, attachment.activeTo],
  );
  const current = (zone: string) => tariff.currentPrices.find((p) => p.zone === zone);
  const thisMonth = todayDateOnly().slice(0, 7);
  const form = useForm<OverrideTariffValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: `${tariff.name} (${apartment.name})`.slice(0, 100),
      effectiveFrom: thisMonth >= attachment.activeFrom ? thisMonth : attachment.activeFrom,
      // Prefilled with the shared prices in effect now: usually only one of them changes.
      price: current('TOTAL') ? formatPrice(current('TOTAL')!.price) : '',
      nightPrice: current('NIGHT') ? formatPrice(current('NIGHT')!.price) : '',
    },
  });
  const effectiveFrom = useWatch({ control: form.control, name: 'effectiveFrom' });

  async function onSubmit(v: OverrideTariffValues) {
    const night = normalizePrice(v.nightPrice);
    const prices = [
      { zone: 'TOTAL' as const, price: normalizePrice(v.price) ?? v.price },
      ...(zoned && night !== null ? [{ zone: 'NIGHT' as const, price: night }] : []),
    ];
    try {
      await override.mutateAsync({
        id: attachment.id,
        body: { name: v.name, effectiveFrom: v.effectiveFrom, prices },
      });
      toast.success('Окремий тариф створено');
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
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="override-name">Назва окремого тарифу</FieldLabel>
              <Input
                {...field}
                id="override-name"
                maxLength={100}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="effectiveFrom"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="override-from">Діє з</FieldLabel>
              <Input
                {...field}
                id="override-from"
                type="month"
                min={attachment.activeFrom}
                max={attachment.activeTo ?? undefined}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                effectiveFrom && (
                  <FieldDescription>
                    Минулі місяці лишаються за спільним тарифом; з {formatPeriod(effectiveFrom)}{' '}
                    квартира рахується за окремим.
                  </FieldDescription>
                )
              )}
            </Field>
          )}
        />
        <Controller
          name="price"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="override-price">
                {zoned ? 'Ціна (загальна / день)' : 'Ціна'}
              </FieldLabel>
              <PriceInput
                {...field}
                id="override-price"
                unit={unit}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {zoned && (
          <Controller
            name="nightPrice"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="override-night-price">Нічна ціна (необов’язково)</FieldLabel>
                <PriceInput
                  {...field}
                  id="override-night-price"
                  unit={unit}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Збереження…' : 'Створити окремий тариф'}
        </Button>
      </FieldGroup>
    </form>
  );
}
