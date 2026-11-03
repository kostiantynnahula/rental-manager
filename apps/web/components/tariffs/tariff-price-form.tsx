'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { applyApiError, type FieldErrorRule } from '@/lib/api/api-error';
import {
  useAddTariffPrice,
  useUpdateTariffPrice,
  type Tariff,
  type TariffPrice,
} from '@/lib/api/queries/tariffs';
import { todayDateOnly } from '@/lib/format';
import { formatPrice, normalizePrice } from '@/lib/tariff-prices';
import { ZONE_LABELS, type Zone } from '@/lib/utilities';
import { DUPLICATE_PRICE, NEEDS_TOTAL } from './constants/server-errors';
import { isZoned } from './helpers/is-zoned';
import { priceUnit } from './helpers/price-unit';
import { tariffPriceSchema, type TariffPriceFormValues } from './helpers/tariff-price-schema';
import { PriceInput } from './price-input';

const ZONES: Zone[] = ['TOTAL', 'NIGHT', 'DAY'];

const EARLIEST_NEEDS_TOTAL =
  'Найраніший місяць тарифу має мати загальну ціну — інші зони беруть її, коли своєї немає';

// The API answers 400 when adding and 409 when fixing a row; both land on "Діє з".
const SERVER_FIELD_ERRORS: FieldErrorRule<TariffPriceFormValues>[] = [
  {
    status: 409,
    bodyIncludes: DUPLICATE_PRICE,
    field: 'effectiveFrom',
    alsoFields: ['zone'],
    message: 'Ціна на цей місяць і зону вже є — виправте її',
  },
  { status: 400, bodyIncludes: NEEDS_TOTAL, field: 'effectiveFrom', message: EARLIEST_NEEDS_TOTAL },
  { status: 409, bodyIncludes: NEEDS_TOTAL, field: 'effectiveFrom', message: EARLIEST_NEEDS_TOTAL },
];

interface TariffPriceFormProps {
  // Only id, kind and utilities are used: a list item (apartment tab) works too.
  tariff: Tariff;
  // Fix this row; a new price otherwise.
  price?: TariffPrice;
  onDone: () => void;
}

// New price = POST (a change from some month on), fix = PATCH (a mistake in an existing row).
export function TariffPriceForm({ tariff, price, onDone }: TariffPriceFormProps) {
  const add = useAddTariffPrice(tariff.id);
  const fix = useUpdateTariffPrice(tariff.id);
  const zoned = isZoned(tariff);
  const unit = priceUnit(tariff);
  const form = useForm<TariffPriceFormValues>({
    resolver: zodResolver(tariffPriceSchema),
    defaultValues: {
      effectiveFrom: price?.effectiveFrom ?? todayDateOnly().slice(0, 7),
      zone: price?.zone ?? 'TOTAL',
      price: price ? formatPrice(price.price) : '',
    },
  });

  async function onSubmit(v: TariffPriceFormValues) {
    const body = { ...v, price: normalizePrice(v.price) ?? v.price };
    try {
      if (price) await fix.mutateAsync({ priceId: price.id, body });
      else await add.mutateAsync(body);
      toast.success(price ? 'Ціну виправлено' : 'Ціну додано');
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
          name="effectiveFrom"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="tariff-price-from">Діє з</FieldLabel>
              <Input
                {...field}
                id="tariff-price-from"
                type="month"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {zoned && (
          <Controller
            name="zone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tariff-price-zone">Зона</FieldLabel>
                <NativeSelect {...field} id="tariff-price-zone" aria-invalid={fieldState.invalid}>
                  {ZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {ZONE_LABELS[zone]}
                    </option>
                  ))}
                </NativeSelect>
                <FieldDescription>Зона без своєї ціни рахується за загальною</FieldDescription>
              </Field>
            )}
          />
        )}
        <Controller
          name="price"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="tariff-price-value">Ціна</FieldLabel>
              <PriceInput
                {...field}
                id="tariff-price-value"
                unit={unit}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
