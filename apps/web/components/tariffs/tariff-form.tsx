'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useResetAfterSave } from '@/hooks/use-reset-after-save';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { applyApiError, type FieldErrorRule } from '@/lib/api/api-error';
import {
  useCreateTariff,
  useUpdateTariff,
  type TariffDetail,
  type TariffKind,
} from '@/lib/api/queries/tariffs';
import { ApartmentsMultiSelect } from './apartments-multi-select';
import {
  IN_USE_REASON,
  MANUAL_KIND_LOCKED,
  TARIFF_KIND_HINTS,
  TARIFF_KIND_LABELS,
} from './constants/labels';
import {
  APARTMENT_IS_ARCHIVED,
  ATTACHED,
  DUPLICATE_NAME,
  UNKNOWN_APARTMENTS,
} from './constants/server-errors';
import { UTILITY_SETS } from './constants/utility-sets';
import { isZoned } from './helpers/is-zoned';
import { priceUnit } from './helpers/price-unit';
import { toCreateTariffInput } from './helpers/to-create-tariff-input';
import { toTariffUtilities } from './helpers/to-tariff-utilities';
import { tariffFormDefaults } from './helpers/tariff-form-defaults';
import { tariffFormSchema, type TariffFormValues } from './helpers/tariff-form-schema';
import { PriceInput } from './price-input';

const KINDS: TariffKind[] = ['METERED', 'FIXED', 'MANUAL'];

const SERVER_FIELD_ERRORS: FieldErrorRule<TariffFormValues>[] = [
  {
    status: 409,
    bodyIncludes: DUPLICATE_NAME,
    field: 'name',
    message: 'Тариф з такою назвою вже існує',
  },
  {
    status: 409,
    bodyIncludes: ATTACHED,
    field: 'kind',
    message: `${IN_USE_REASON} — тип і послугу змінити не можна`,
  },
  // Picked apartments changed meanwhile (archived or gone in another tab).
  {
    status: 409,
    bodyIncludes: APARTMENT_IS_ARCHIVED,
    field: 'apartmentIds',
    message: 'Одна з квартир в архіві — приберіть її',
  },
  {
    status: 400,
    bodyIncludes: UNKNOWN_APARTMENTS,
    field: 'apartmentIds',
    message: 'Одну з квартир не знайдено — оновіть сторінку',
  },
];

interface TariffFormProps {
  // Edit this tariff; create otherwise (with the first price and apartments).
  tariff?: TariffDetail;
  // Create from an apartment's "Тарифи" tab: preselected, and saving/cancelling goes back there.
  apartmentId?: string;
}

// Prices of an existing tariff live on its page, attachments on the apartments' tabs.
export function TariffForm({ tariff, apartmentId }: TariffFormProps) {
  const router = useRouter();
  const create = useCreateTariff();
  const update = useUpdateTariff(tariff?.id ?? '');
  // Keeps the button disabled after a successful save while the next page loads.
  const [saved, setSaved] = useState(false);
  const schema = useMemo(() => tariffFormSchema(!tariff), [tariff]);
  // Attached to an apartment: statements bill by kind/utilities, so they're fixed (the API returns 409).
  const billingLocked = tariff?.inUse ?? false;
  // Editing: the API never changes a kind to or from MANUAL (prices would appear or vanish).
  const manualLocked = Boolean(tariff) && !billingLocked;
  const isKindDisabled = (value: TariffKind) =>
    manualLocked && tariff !== undefined && (value === 'MANUAL') !== (tariff.kind === 'MANUAL');
  const apartmentTab = !tariff && apartmentId ? `/apartments/${apartmentId}?tab=tariffs` : null;

  const form = useForm<TariffFormValues>({
    resolver: zodResolver(schema),
    defaultValues: tariffFormDefaults(tariff, apartmentId),
  });
  const kind = useWatch({ control: form.control, name: 'kind' });
  const utilitySet = useWatch({ control: form.control, name: 'utilitySet' });
  const shape = { kind, utilities: toTariffUtilities(kind, utilitySet) };
  const unit = priceUnit(shape);

  const { isDirty, isSubmitting } = form.formState;
  const { confirmLeave, allowLeave, dialog } = useUnsavedChanges(isDirty && !saved);
  // The page stays mounted (hidden) after navigating away. Next visit: create starts fresh, edit shows what
  // was just saved.
  const [lastSaved, setLastSaved] = useState<TariffFormValues | null>(null);
  const markSaved = useResetAfterSave(() => {
    form.reset(tariff && lastSaved ? lastSaved : tariffFormDefaults(undefined, apartmentId));
    setSaved(false);
  });

  async function onSubmit(v: TariffFormValues) {
    try {
      const result = tariff
        ? // null clears the notes. kind/utilities are always sent: unchanged values pass even when attached.
          await update.mutateAsync({
            name: v.name,
            notes: v.notes || null,
            kind: v.kind,
            utilities: toTariffUtilities(v.kind, v.utilitySet),
          })
        : await create.mutateAsync(toCreateTariffInput(v));
      setSaved(true);
      setLastSaved(v);
      markSaved();
      allowLeave();
      toast.success('Тариф збережено');
      router.push(apartmentTab ?? `/tariffs/${result.id}`);
    } catch (error) {
      applyApiError(error, { setError: form.setError, fields: SERVER_FIELD_ERRORS });
    }
  }

  function cancel() {
    confirmLeave(() => {
      // Opened directly (no history in this tab) → go to a sensible parent instead of leaving the app.
      if (window.history.length > 1) router.back();
      else router.push(tariff ? `/tariffs/${tariff.id}` : (apartmentTab ?? '/tariffs'));
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
              <FieldLabel htmlFor="tariff-name">Назва</FieldLabel>
              <Input
                {...field}
                id="tariff-name"
                placeholder="Вивіз сміття (Сихів)"
                maxLength={100}
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Якщо ціна залежить від району чи будинку — окремий тариф
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="kind"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Тип</FieldLabel>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => field.onChange(value as TariffKind)}
                disabled={billingLocked}
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                {KINDS.map((value) => (
                  <label
                    key={value}
                    htmlFor={`tariff-kind-${value}`}
                    className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 has-data-checked:border-primary has-disabled:opacity-60"
                  >
                    <RadioGroupItem
                      id={`tariff-kind-${value}`}
                      value={value}
                      disabled={isKindDisabled(value)}
                    />
                    <span className="flex flex-col">
                      <span>{TARIFF_KIND_LABELS[value]}</span>
                      <span className="text-xs text-muted-foreground">
                        {TARIFF_KIND_HINTS[value]}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
              {billingLocked ? (
                <FieldDescription>
                  {IN_USE_REASON} — щоб змінити тип чи послугу, створіть новий тариф
                </FieldDescription>
              ) : (
                manualLocked && <FieldDescription>{MANUAL_KIND_LOCKED}</FieldDescription>
              )}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {kind === 'METERED' && (
          <Controller
            name="utilitySet"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tariff-utilities">Послуга</FieldLabel>
                <NativeSelect
                  {...field}
                  id="tariff-utilities"
                  disabled={billingLocked}
                  aria-invalid={fieldState.invalid}
                >
                  <option value="" disabled>
                    Оберіть…
                  </option>
                  {UTILITY_SETS.map((set) => (
                    <option key={set.value} value={set.value}>
                      {set.label}
                    </option>
                  ))}
                </NativeSelect>
                <FieldDescription>
                  Споживання яких лічильників множиться на ціну (напр. водовідведення — холодна +
                  гаряча вода)
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}

        {!tariff && kind === 'MANUAL' && (
          <Controller
            name="apartmentIds"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tariff-apartments">Квартири</FieldLabel>
                <ApartmentsMultiSelect
                  id="tariff-apartments"
                  value={field.value}
                  onChange={field.onChange}
                />
                <FieldDescription>
                  Ціни немає: суму вводять у рахунку за кожен місяць. Підключаться з поточного
                  місяця, пізніше — на вкладці «Тарифи» квартири
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}

        {!tariff && kind !== 'MANUAL' && (
          <FieldSet>
            <FieldLegend>Початкова ціна</FieldLegend>
            <FieldDescription>
              Подорожчання потім додається на сторінці тарифу як нова ціна з нового місяця
            </FieldDescription>
            <FieldGroup>
              <Controller
                name="effectiveFrom"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="tariff-effective-from">Діє з</FieldLabel>
                    <Input
                      {...field}
                      id="tariff-effective-from"
                      type="month"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="price"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="tariff-price">
                      {isZoned(shape) ? 'Ціна (загальна / день)' : 'Ціна'}
                    </FieldLabel>
                    <PriceInput
                      {...field}
                      id="tariff-price"
                      unit={unit}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              {isZoned(shape) && (
                <Controller
                  name="nightPrice"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="tariff-night-price">
                        Нічна ціна (необов’язково)
                      </FieldLabel>
                      <PriceInput
                        {...field}
                        id="tariff-night-price"
                        unit={unit}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldDescription>Для двозонних лічильників (день/ніч)</FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              )}
              <Controller
                name="apartmentIds"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="tariff-apartments">Квартири</FieldLabel>
                    <ApartmentsMultiSelect
                      id="tariff-apartments"
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FieldDescription>
                      Підключаться з місяця «Діє з». Пізніше — на вкладці «Тарифи» квартири
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>
        )}

        <Controller
          name="notes"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="tariff-notes">Нотатки</FieldLabel>
              <Textarea {...field} id="tariff-notes" rows={3} />
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
