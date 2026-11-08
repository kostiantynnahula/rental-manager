'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { emptyValues } from '@/components/meters/helpers/empty-values';
import { meterTitle } from '@/components/meters/helpers/meter-title';
import { toReadingValuesInput } from '@/components/meters/helpers/reading-values-schema';
import { ReadingValuesInput } from '@/components/meters/reading-values-input';
import { NativeSelect } from '@/components/native-select';
import { readingErrorMessage } from '@/components/readings/helpers/reading-error-message';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useResetAfterSave } from '@/hooks/use-reset-after-save';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import type { Meter } from '@/lib/api/queries/meters';
import { useFetchUnassignedPhotos, type PhotoDetail } from '@/lib/api/queries/photos';
import { useApartmentPeriodReadings, useCreateReading } from '@/lib/api/queries/readings';
import { formatDate, formatPeriod, todayDateOnly } from '@/lib/format';
import { defaultReadingPeriod, isPeriod, readingDateWindow } from '@/lib/period';
import { UTILITY_ORDER } from '@/lib/utilities';
import { PERIOD_STATUS_LABELS } from './constants/reading-statuses';
import { photoReadingDate } from './helpers/photo-reading-date';
import { photoReadingSchema, type PhotoReadingValues } from './helpers/photo-reading-schema';
import { pickMeter } from './helpers/pick-meter';

// All defaults in one place: a worker DRAFT can prefill them here later.
function formDefaults(photo: PhotoDetail): PhotoReadingValues {
  const period = defaultReadingPeriod(todayDateOnly());
  return {
    period,
    readingDate: photoReadingDate(photo.createdAt, period),
    meterId: '',
    values: [],
  };
}

interface PhotoReadingFormProps {
  apartmentId: string;
  photo: PhotoDetail;
  // All meters of the apartment (incl. removed): zone scheme and last confirmed values per meter.
  meters: Meter[];
}

// One meter's reading typed from the photo; saved CONFIRMED right away with the photo attached (source PHOTO).
export function PhotoReadingForm({ apartmentId, photo, meters }: PhotoReadingFormProps) {
  const router = useRouter();
  const create = useCreateReading();
  const fetchUnassigned = useFetchUnassignedPhotos(apartmentId);
  const tabHref = `/apartments/${apartmentId}?tab=photos`;
  const [saved, setSaved] = useState<{ meterId: string; period: string }[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [goingNext, setGoingNext] = useState(false);

  const schema = useMemo(() => photoReadingSchema(meters), [meters]);
  const form = useForm<PhotoReadingValues>({
    resolver: zodResolver(schema),
    defaultValues: formDefaults(photo),
  });
  const { isSubmitting, isDirty } = form.formState;
  const period = useWatch({ control: form.control, name: 'period' });
  const meterId = useWatch({ control: form.control, name: 'meterId' });
  const validPeriod = isPeriod(period);

  const periodReadings = useApartmentPeriodReadings(apartmentId, period, { enabled: validPeriod });
  // Same order as the meters tab: by utility, then the API's order.
  const rows = useMemo(() => {
    const data = validPeriod ? (periodReadings.data ?? []) : [];
    return UTILITY_ORDER.flatMap((u) => data.filter((r) => r.meter.utility === u));
  }, [periodReadings.data, validPeriod]);
  const savedHere = useMemo(
    () => new Set(saved.filter((s) => s.period === period).map((s) => s.meterId)),
    [saved, period],
  );
  // CONFIRMED (or saved just now) can't take another reading for the month — the API would refuse it.
  const isSelectable = (id: string) =>
    !savedHere.has(id) && rows.some((r) => r.meter.id === id && r.status !== 'CONFIRMED');

  function selectMeter(id: string) {
    const meter = meters.find((m) => m.id === id);
    form.setValue('meterId', id, { shouldValidate: form.formState.isSubmitted });
    form.setValue('values', meter ? emptyValues(meter.zoneScheme) : []);
  }

  // Preselect the first MISSING meter; again when the month changes and the chosen one isn't available.
  const selectable = meterId !== '' && isSelectable(meterId);
  useEffect(() => {
    if (justSaved || selectable || periodReadings.isPlaceholderData || !periodReadings.data) return;
    const next = pickMeter(
      rows.filter((r) => r.status !== 'CONFIRMED'),
      savedHere,
    );
    if (next !== meterId) selectMeter(next);
    // selectMeter only uses the form API and `meters`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    justSaved,
    selectable,
    rows,
    savedHere,
    periodReadings.isPlaceholderData,
    periodReadings.data,
  ]);

  const { confirmLeave, allowLeave, dialog } = useUnsavedChanges(isDirty && !justSaved);
  const markSaved = useResetAfterSave(() => {
    form.reset(formDefaults(photo));
    setSaved([]);
    setJustSaved(false);
    setSubmitError(null);
  });

  async function onSubmit(v: PhotoReadingValues) {
    setSubmitError(null);
    try {
      await create.mutateAsync({
        meterId: v.meterId,
        body: {
          period: v.period,
          readingDate: v.readingDate,
          values: toReadingValuesInput(v.values),
          photoId: photo.id,
          confirm: true,
        },
      });
    } catch (error) {
      setSubmitError(readingErrorMessage(error));
      return;
    }
    setSaved((list) => [...list, { meterId: v.meterId, period: v.period }]);
    setJustSaved(true);
    toast.success('Показання збережено');
  }

  // "Ще показання з цього фото": same month and date, the next meter.
  function another() {
    const { period: keptPeriod, readingDate } = form.getValues();
    form.reset({ period: keptPeriod, readingDate, meterId: '', values: [] });
    setJustSaved(false);
  }

  async function nextPhoto() {
    setGoingNext(true);
    try {
      const unassigned = await fetchUnassigned();
      // Newest first. Skip the current photo: it's still "unassigned" if nothing was saved from it.
      const next = unassigned.find((p) => p.id !== photo.id);
      markSaved();
      allowLeave();
      if (next) {
        router.push(`/apartments/${apartmentId}/photos/${next.id}`);
      } else {
        toast.success('Усі фото розібрано');
        router.push(tabHref);
      }
    } catch (error) {
      toast.error(readingErrorMessage(error));
      setGoingNext(false);
    }
  }

  const lastSaved = saved.at(-1);
  const lastSavedMeter = lastSaved && meters.find((m) => m.id === lastSaved.meterId);
  const selectedMeter = meters.find((m) => m.id === meterId);
  const dateWindow = validPeriod ? readingDateWindow(period) : null;
  const busy = isSubmitting || justSaved || goingNext;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="period"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="photo-reading-period">Місяць</FieldLabel>
                <Input
                  {...field}
                  id="photo-reading-period"
                  type="month"
                  disabled={busy}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  isPeriod(field.value) && (
                    <FieldDescription>Показання за {formatPeriod(field.value)}</FieldDescription>
                  )
                )}
              </Field>
            )}
          />
          <Controller
            name="readingDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="photo-reading-date">Дата зняття</FieldLabel>
                <Input
                  {...field}
                  id="photo-reading-date"
                  type="date"
                  min={dateWindow?.from}
                  max={todayDateOnly()}
                  disabled={busy}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  dateWindow && (
                    <FieldDescription>
                      Від {formatDate(dateWindow.from)} до {formatDate(dateWindow.to)}
                    </FieldDescription>
                  )
                )}
              </Field>
            )}
          />
        </div>

        <Controller
          name="meterId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="photo-reading-meter">Лічильник</FieldLabel>
              <NativeSelect
                id="photo-reading-meter"
                name={field.name}
                ref={field.ref}
                value={field.value}
                onChange={(e) => selectMeter(e.target.value)}
                onBlur={field.onBlur}
                disabled={busy || rows.length === 0}
                aria-invalid={fieldState.invalid}
              >
                <option value="">Оберіть лічильник</option>
                {rows.map((r) => (
                  <option key={r.meter.id} value={r.meter.id} disabled={!isSelectable(r.meter.id)}>
                    {meterTitle(r.meter)} —{' '}
                    {savedHere.has(r.meter.id) ? 'збережено' : PERIOD_STATUS_LABELS[r.status]}
                  </option>
                ))}
              </NativeSelect>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : periodReadings.isError ? (
                <FieldDescription>Не вдалося завантажити лічильники за цей місяць</FieldDescription>
              ) : (
                validPeriod &&
                periodReadings.isSuccess &&
                rows.length === 0 && (
                  <FieldDescription>Немає лічильників за цей місяць</FieldDescription>
                )
              )}
            </Field>
          )}
        />

        {selectedMeter && (
          <ReadingValuesInput
            control={form.control}
            name="values"
            zoneScheme={selectedMeter.zoneScheme}
            utility={selectedMeter.utility}
            previous={selectedMeter.lastReading?.values}
            idPrefix={`photo-reading-${selectedMeter.id}`}
            disabled={busy}
          />
        )}
        {selectedMeter?.lastReading && !justSaved && (
          <p className="-mt-4 text-xs text-muted-foreground">
            Попереднє показання від {formatDate(selectedMeter.lastReading.readingDate)}
          </p>
        )}

        {submitError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {submitError}
          </p>
        )}

        {justSaved ? (
          <div className="space-y-3">
            <p
              role="status"
              className="flex items-start gap-2 rounded-lg border border-green-600 bg-green-50 px-3 py-2 text-sm text-green-800"
            >
              <CircleCheck className="mt-0.5 size-4 shrink-0" />
              Збережено{lastSavedMeter && `: ${meterTitle(lastSavedMeter)}`}
              {lastSaved && ` за ${formatPeriod(lastSaved.period)}`}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={another} disabled={goingNext}>
                Ще показання з цього фото
              </Button>
              <Button type="button" onClick={() => void nextPhoto()} disabled={goingNext}>
                {goingNext ? 'Завантаження…' : 'Наступне фото'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                confirmLeave(() => {
                  if (saved.length > 0) markSaved();
                  router.push(tabHref);
                })
              }
              disabled={isSubmitting}
            >
              {saved.length > 0 ? 'Готово' : 'Скасувати'}
            </Button>
            <Button type="submit" disabled={busy || !selectedMeter}>
              {isSubmitting ? 'Збереження…' : 'Зберегти показання'}
            </Button>
          </div>
        )}
      </FieldGroup>
      {dialog}
    </form>
  );
}
