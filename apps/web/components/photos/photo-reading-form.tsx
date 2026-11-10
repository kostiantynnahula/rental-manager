'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { meterTitle } from '@/components/meters/helpers/meter-title';
import { toReadingValuesInput } from '@/components/meters/helpers/reading-values-schema';
import { ReadingValuesInput } from '@/components/meters/reading-values-input';
import { NativeSelect } from '@/components/native-select';
import { DraftValues } from '@/components/readings/draft-values';
import { draftFields } from '@/components/readings/helpers/draft-fields';
import { mergeDraftValues } from '@/components/readings/helpers/merge-draft-values';
import { missingZones } from '@/components/readings/helpers/missing-zones';
import { missingZonesLabel } from '@/components/readings/helpers/missing-zones-label';
import { readingErrorMessage } from '@/components/readings/helpers/reading-error-message';
import { sameFields } from '@/components/readings/helpers/same-fields';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useResetAfterSave } from '@/hooks/use-reset-after-save';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import type { Meter } from '@/lib/api/queries/meters';
import { useFetchUnassignedPhotos, type PhotoDetail } from '@/lib/api/queries/photos';
import {
  useApartmentPeriodReadings,
  useConfirmReading,
  useCreateReading,
  useUpdateReading,
  type ApartmentMeterReading,
} from '@/lib/api/queries/readings';
import { formatDate, formatPeriod, todayDateOnly } from '@/lib/format';
import { useHasLease } from '@/components/readings/hooks/use-has-lease';
import { defaultReadingPeriod, isPeriod, readingDateWindow } from '@/lib/period';
import { UTILITY_ORDER, ZONE_LABELS, zonesFor, type Zone } from '@/lib/utilities';
import { PERIOD_STATUS_LABELS } from './constants/reading-statuses';
import { photoReadingDate } from './helpers/photo-reading-date';
import { photoReadingSchema, type PhotoReadingValues } from './helpers/photo-reading-schema';
import { photoDraftZones } from './helpers/photo-draft-zones';
import { pickMeter } from './helpers/pick-meter';

// All defaults in one place. A draft holding a value from this photo (the worker's) opens on its month.
function formDefaults(photo: PhotoDetail): PhotoReadingValues {
  const draft = photo.readings.find((r) => r.status === 'DRAFT' && r.kind === 'REGULAR');
  const period = draft?.period ?? defaultReadingPeriod(todayDateOnly());
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

// A saved meter in this session; `missing` = zones its draft still lacks (empty = confirmed).
interface SavedEntry {
  meterId: string;
  period: string;
  missing: Zone[];
}

// The month's DRAFT of a meter (MISSING/CONFIRMED → null).
function draftOf(rows: ApartmentMeterReading[], meterId: string) {
  const row = rows.find((r) => r.meter.id === meterId);
  return row?.status === 'DRAFT' ? row.reading : null;
}

// One meter's values typed from the photo, each with the photo attached (source PHOTO). One photo shows one register,
// so a two-zone meter may take only some zones from it: they complete the month's draft if there is one. Complete →
// CONFIRMED right away; otherwise saved as a DRAFT that another photo (or the batch form) completes.
export function PhotoReadingForm({ apartmentId, photo, meters }: PhotoReadingFormProps) {
  const router = useRouter();
  const create = useCreateReading();
  const update = useUpdateReading();
  const confirm = useConfirmReading();
  const fetchUnassigned = useFetchUnassignedPhotos(apartmentId);
  const tabHref = `/apartments/${apartmentId}?tab=photos`;
  const [saved, setSaved] = useState<SavedEntry[]>([]);
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
  const hasLease = useHasLease(apartmentId, period);
  const meterId = useWatch({ control: form.control, name: 'meterId' });
  const values = useWatch({ control: form.control, name: 'values' });
  const validPeriod = isPeriod(period);

  const periodReadings = useApartmentPeriodReadings(apartmentId, period, { enabled: validPeriod });
  // Same order as the meters tab: by utility, then the API's order.
  const rows = useMemo(() => {
    const data = validPeriod ? (periodReadings.data ?? []) : [];
    return UTILITY_ORDER.flatMap((u) => data.filter((r) => r.meter.utility === u));
  }, [periodReadings.data, validPeriod]);
  const savedHere = useMemo(
    () => new Map(saved.filter((s) => s.period === period).map((s) => [s.meterId, s])),
    [saved, period],
  );
  // CONFIRMED (or saved just now) can't take another reading for the month — the API would refuse it.
  const isSelectable = (id: string) =>
    !savedHere.has(id) && rows.some((r) => r.meter.id === id && r.status !== 'CONFIRMED');

  // Inputs: the zones the draft took from this photo, prefilled and editable (the worker's proposal to check);
  // otherwise the zones the meter still lacks this month (all of them without a draft).
  function selectMeter(id: string) {
    const meter = meters.find((m) => m.id === id);
    const draft = draftOf(rows, id);
    const fromPhoto = draft ? photoDraftZones(draft.values, photo.id) : [];
    const fields = !meter
      ? []
      : fromPhoto.length > 0
        ? draftFields(meter.zoneScheme, draft!.values).filter((v) => fromPhoto.includes(v.zone))
        : draftFields(meter.zoneScheme, []).filter(
            (v) => !draft || missingZones(meter.zoneScheme, draft.values).includes(v.zone),
          );
    form.setValue('meterId', id, { shouldValidate: form.formState.isSubmitted });
    form.setValue('values', fields);
  }

  // "Зони на цьому фото": add/remove a zone's input, keeping what was typed in the others.
  function toggleZone(zone: Zone, on: boolean) {
    const meter = meters.find((m) => m.id === meterId);
    if (!meter) return;
    const current = form.getValues('values');
    // A zone the draft took from this photo comes back with its value.
    const stored = draftFields(meter.zoneScheme, draftOf(rows, meter.id)?.values ?? []);
    const back = photoZones.includes(zone) ? stored.find((v) => v.zone === zone) : undefined;
    const next = on
      ? zonesFor(meter.zoneScheme).flatMap((z) =>
          z === zone ? [{ zone, value: back?.value ?? '' }] : current.filter((v) => v.zone === z),
        )
      : current.filter((v) => v.zone !== zone);
    form.setValue('values', next, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
  }

  // Preselect the first MISSING meter; again when the month changes and the chosen one isn't available.
  const selectable = meterId !== '' && isSelectable(meterId);
  useEffect(() => {
    if (justSaved || selectable || periodReadings.isPlaceholderData || !periodReadings.data) return;
    const next = pickMeter(
      rows.filter((r) => r.status !== 'CONFIRMED'),
      savedHere,
      photo.id,
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
    const meter = meters.find((m) => m.id === v.meterId);
    if (!meter) return;
    const fromPhoto = toReadingValuesInput(v.values).map((x) => ({ ...x, photoId: photo.id }));
    const draft = draftOf(rows, v.meterId);
    const all = draft ? mergeDraftValues(meter.zoneScheme, draft.values, fromPhoto) : fromPhoto;
    const missing = missingZones(meter.zoneScheme, all);
    try {
      if (draft) {
        await update.mutateAsync({
          id: draft.id,
          body: { readingDate: v.readingDate, values: all },
        });
        if (missing.length === 0) await confirm.mutateAsync(draft.id);
      } else {
        await create.mutateAsync({
          meterId: v.meterId,
          body: {
            period: v.period,
            readingDate: v.readingDate,
            values: fromPhoto,
            confirm: missing.length === 0,
          },
        });
      }
    } catch (error) {
      setSubmitError(readingErrorMessage(error));
      return;
    }
    saveDone({ meterId: v.meterId, period: v.period, missing });
  }

  // A complete draft (e.g. proposed by the worker) only needs confirming.
  async function confirmDraft(id: string) {
    setSubmitError(null);
    try {
      await confirm.mutateAsync(id);
    } catch (error) {
      setSubmitError(readingErrorMessage(error));
      return;
    }
    saveDone({ meterId, period, missing: [] });
  }

  function saveDone(entry: SavedEntry) {
    setSaved((list) => [...list, entry]);
    setJustSaved(true);
    toast.success(entry.missing.length === 0 ? 'Показання збережено' : 'Чернетку збережено');
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
  const draft = selectedMeter ? draftOf(rows, selectedMeter.id) : null;
  // Zones the draft already took from this photo: editable here.
  const photoZones = draft ? photoDraftZones(draft.values, photo.id) : [];
  // Zones this photo can fill: all of them, or the ones the draft lacks, plus its own.
  const openZones = selectedMeter
    ? zonesFor(selectedMeter.zoneScheme).filter(
        (z) =>
          photoZones.includes(z) ||
          missingZones(selectedMeter.zoneScheme, draft?.values ?? []).includes(z),
      )
    : [];
  const chosenZones = values.map((v) => v.zone);
  const completes =
    !!selectedMeter &&
    missingZones(selectedMeter.zoneScheme, [...(draft?.values ?? []), ...values]).length === 0;
  // The proposal from this photo as prefilled (nobody edited it): nothing to save, only to confirm.
  const prefill =
    selectedMeter && draft
      ? draftFields(selectedMeter.zoneScheme, draft.values).filter((v) =>
          photoZones.includes(v.zone),
        )
      : [];
  const untouched = prefill.length > 0 && sameFields(values, prefill);
  const confirmOnly = !!draft && completes && (openZones.length === 0 || untouched);
  const dateWindow = validPeriod ? readingDateWindow(period) : null;
  const busy = isSubmitting || confirm.isPending || justSaved || goingNext;
  const valuesError =
    form.formState.errors.values?.message ?? form.formState.errors.values?.root?.message;

  // A meter's state in the select: saved here, or the month's status (+ what its draft lacks).
  function meterStatusLabel(r: ApartmentMeterReading): string {
    const here = savedHere.get(r.meter.id);
    if (here) return here.missing.length === 0 ? 'збережено' : 'чернетку збережено';
    const lacking =
      r.status === 'DRAFT' && r.reading ? missingZones(r.meter.zoneScheme, r.reading.values) : [];
    return lacking.length > 0
      ? `${PERIOD_STATUS_LABELS[r.status]}, ${missingZonesLabel(lacking)}`
      : PERIOD_STATUS_LABELS[r.status];
  }

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
                    {meterTitle(r.meter)} — {meterStatusLabel(r)}
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

        {draft?.note && !justSaved && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm break-words whitespace-pre-wrap">
            <span className="text-muted-foreground">Примітка: </span>
            {draft.note}
          </p>
        )}
        {selectedMeter && draft && !justSaved && (
          <DraftValues
            values={draft.values.filter((v) => !chosenZones.includes(v.zone))}
            utility={selectedMeter.utility}
            label={`${meterTitle(selectedMeter)}, ${formatPeriod(period)}`}
          />
        )}
        {selectedMeter && openZones.length > 1 && !justSaved && (
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Зони на цьому фото</legend>
            <div className="flex flex-wrap gap-x-6">
              {openZones.map((zone) => (
                <label
                  key={zone}
                  className="flex min-h-11 cursor-pointer items-center gap-3 text-sm md:min-h-8"
                >
                  <input
                    type="checkbox"
                    checked={chosenZones.includes(zone)}
                    onChange={(e) => toggleZone(zone, e.target.checked)}
                    disabled={busy}
                    className="size-5 shrink-0 accent-primary"
                  />
                  {ZONE_LABELS[zone]}
                </label>
              ))}
            </div>
            {valuesError && <FieldError errors={[{ message: valuesError }]} />}
          </fieldset>
        )}
        {selectedMeter && values.length > 0 && (
          <ReadingValuesInput
            control={form.control}
            name="values"
            zoneScheme={selectedMeter.zoneScheme}
            utility={selectedMeter.utility}
            previous={selectedMeter.lastReading?.values}
            check={
              selectedMeter.lastReading
                ? { previousPeriod: selectedMeter.lastReading.period, period, hasLease }
                : undefined
            }
            idPrefix={`photo-reading-${selectedMeter.id}`}
            disabled={busy}
            zones={chosenZones}
          />
        )}
        {selectedMeter && !completes && values.length > 0 && !justSaved && (
          <p className="-mt-4 text-xs text-muted-foreground">
            Збережеться як чернетка (
            {missingZonesLabel(
              missingZones(selectedMeter.zoneScheme, [...(draft?.values ?? []), ...values]),
            )}
            ) — її можна доповнити з іншого фото
          </p>
        )}
        {selectedMeter?.lastReading && !justSaved && openZones.length > 0 && (
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
              {lastSaved && lastSaved.missing.length > 0 ? 'Чернетку збережено' : 'Збережено'}
              {lastSavedMeter && `: ${meterTitle(lastSavedMeter)}`}
              {lastSaved && ` за ${formatPeriod(lastSaved.period)}`}
              {lastSaved &&
                lastSaved.missing.length > 0 &&
                ` (${missingZonesLabel(lastSaved.missing)})`}
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
            {draft && confirmOnly ? (
              <Button type="button" onClick={() => void confirmDraft(draft.id)} disabled={busy}>
                {confirm.isPending ? 'Підтвердження…' : 'Підтвердити чернетку'}
              </Button>
            ) : (
              <Button type="submit" disabled={busy || !selectedMeter}>
                {isSubmitting
                  ? 'Збереження…'
                  : completes
                    ? 'Зберегти показання'
                    : 'Зберегти чернетку'}
              </Button>
            )}
          </div>
        )}
      </FieldGroup>
      {dialog}
    </form>
  );
}
