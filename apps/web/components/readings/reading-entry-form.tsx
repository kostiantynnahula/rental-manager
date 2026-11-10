'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { emptyValues } from '@/components/meters/helpers/empty-values';
import {
  toReadingValuesInput,
  type ReadingValueField,
} from '@/components/meters/helpers/reading-values-schema';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useResetAfterSave } from '@/hooks/use-reset-after-save';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import type { Meter } from '@/lib/api/queries/meters';
import {
  useApartmentPeriodReadings,
  useConfirmReading,
  useCreateReading,
  useUpdateReading,
  type Reading,
} from '@/lib/api/queries/readings';
import { formatDate, formatPeriod, todayDateOnly } from '@/lib/format';
import { defaultReadingPeriod, isPeriod, readingDateWindow } from '@/lib/period';
import {
  batchReadingsSchema,
  isEntryEmpty,
  type BatchReadingsValues,
} from './helpers/batch-readings-schema';
import { useHasLease } from './hooks/use-has-lease';
import { isUntouchedPrefill } from './helpers/is-untouched-prefill';
import { draftFields } from './helpers/draft-fields';
import { mergeDraftValues } from './helpers/merge-draft-values';
import { readingErrorMessage } from './helpers/reading-error-message';
import { sameFields } from './helpers/same-fields';
import { MeterReadingEntry, type EntryResult } from './meter-reading-entry';

function entryDefaults(meters: Meter[], initialPeriod?: string): BatchReadingsValues {
  const today = todayDateOnly();
  return {
    period: initialPeriod ?? defaultReadingPeriod(today),
    readingDate: today,
    entries: meters.map((m) => ({ meterId: m.id, values: emptyValues(m.zoneScheme) })),
  };
}

interface ReadingEntryFormProps {
  apartmentId: string;
  // Active meters of the apartment, with their last confirmed values (= previous values).
  meters: Meter[];
  // Preselected month ("YYYY-MM"); otherwise defaultReadingPeriod.
  initialPeriod?: string;
}

// A meter's draft for the month, as prefilled into its inputs.
interface Prefill {
  draft: Reading;
  fields: ReadingValueField[];
}

// All active meters of an apartment for one month. Each filled meter is its own POST (confirm: true), so one
// failing meter doesn't block the others: saved ones get locked, failed ones keep the API message for a retry.
// A meter with a DRAFT for the month (e.g. one zone from a photo) is prefilled with it: completing it saves the
// draft (PATCH, keeping the photos of unchanged values) and confirms it; an untouched complete draft has its own
// "Підтвердити" button, an untouched incomplete one is skipped like an empty meter.
export function ReadingEntryForm({ apartmentId, meters, initialPeriod }: ReadingEntryFormProps) {
  const router = useRouter();
  const create = useCreateReading();
  const update = useUpdateReading();
  const confirm = useConfirmReading();
  const [prefills, setPrefills] = useState<Record<string, Prefill>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const back = `/apartments/${apartmentId}?tab=readings`;
  const [results, setResults] = useState<Record<string, EntryResult>>({});
  const [done, setDone] = useState(false);

  const savedIds = useMemo(
    () => new Set(Object.keys(results).filter((id) => results[id].status === 'saved')),
    [results],
  );
  const prefilledFields = useMemo(
    () => Object.fromEntries(Object.entries(prefills).map(([id, p]) => [id, p.fields])),
    [prefills],
  );
  // Saved meters and untouched drafts are neither validated nor sent.
  const schema = useMemo(
    () => batchReadingsSchema(meters, savedIds, prefilledFields),
    [meters, savedIds, prefilledFields],
  );

  const form = useForm<BatchReadingsValues>({
    resolver: zodResolver(schema),
    defaultValues: entryDefaults(meters, initialPeriod),
  });
  const { isSubmitting } = form.formState;
  const entries = useWatch({ control: form.control, name: 'entries' });
  const period = useWatch({ control: form.control, name: 'period' });
  const hasLease = useHasLease(apartmentId, period);
  const isUntouchedDraft = (e: BatchReadingsValues['entries'][number]) =>
    isUntouchedPrefill(e, prefilledFields);
  // Unsaved = something typed for a meter that isn't saved yet (a prefilled draft nobody edited isn't).
  const hasUnsaved = entries.some(
    (e) => !savedIds.has(e.meterId) && !isEntryEmpty(e) && !isUntouchedDraft(e),
  );

  // The month's drafts (not the previous month's list kept on screen while loading).
  const periodReadings = useApartmentPeriodReadings(apartmentId, period, {
    enabled: isPeriod(period),
  });
  const drafts = useMemo(() => {
    if (!isPeriod(period) || periodReadings.isPlaceholderData || !periodReadings.data) return null;
    return new Map(
      periodReadings.data.flatMap((r) =>
        r.status === 'DRAFT' && r.reading ? [[r.meter.id, r.reading] as const] : [],
      ),
    );
  }, [period, periodReadings.isPlaceholderData, periodReadings.data]);

  // Prefill each meter nobody has typed into with its draft for the month; when the month (or the draft) changes,
  // an untouched prefill is replaced (or cleared). Typed values are never overwritten.
  useEffect(() => {
    if (!drafts) return;
    const next: Record<string, Prefill> = {};
    form.getValues('entries').forEach((entry, index) => {
      const meter = meters.find((m) => m.id === entry.meterId);
      if (!meter || savedIds.has(entry.meterId)) return;
      const prefill = prefills[entry.meterId];
      const untouched =
        isEntryEmpty(entry) || (!!prefill && sameFields(entry.values, prefill.fields));
      const draft = drafts.get(entry.meterId);
      if (!untouched) {
        if (prefill && draft?.id === prefill.draft.id) next[entry.meterId] = { ...prefill, draft };
        return;
      }
      const fields = draft
        ? draftFields(meter.zoneScheme, draft.values)
        : emptyValues(meter.zoneScheme);
      if (!sameFields(entry.values, fields)) form.setValue(`entries.${index}.values`, fields);
      if (draft) next[entry.meterId] = { draft, fields };
    });
    setPrefills(next);
    // Runs when the month's drafts arrive; prefills/savedIds are read as of then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts]);
  const { confirmLeave, allowLeave, dialog } = useUnsavedChanges(hasUnsaved && !done);
  // The page stays mounted (hidden) after navigating away: start fresh next time.
  const markSaved = useResetAfterSave(() => {
    form.reset(entryDefaults(meters, initialPeriod));
    setResults({});
    setPrefills({});
    setDone(false);
  });

  // A draft: PATCH (a value typed over replaces the stored one and its photo; unchanged ones keep theirs), then
  // confirm. Otherwise one POST with confirm: true.
  async function saveEntry(v: BatchReadingsValues, e: BatchReadingsValues['entries'][number]) {
    const typed = toReadingValuesInput(e.values);
    const prefill = prefills[e.meterId];
    const meter = meters.find((m) => m.id === e.meterId);
    if (!prefill || !meter) {
      await create.mutateAsync({
        meterId: e.meterId,
        body: { period: v.period, readingDate: v.readingDate, values: typed, confirm: true },
      });
      return;
    }
    const { draft } = prefill;
    const changed = typed.filter(
      (t) => !draft.values.some((d) => d.zone === t.zone && d.value === t.value),
    );
    await update.mutateAsync({
      id: draft.id,
      body: {
        readingDate: v.readingDate,
        values: mergeDraftValues(meter.zoneScheme, draft.values, changed),
      },
    });
    await confirm.mutateAsync(draft.id);
  }

  // An untouched complete draft: confirmed as stored (its own reading date).
  async function confirmDraft(meterId: string, draftId: string) {
    setConfirmingId(meterId);
    try {
      await confirm.mutateAsync(draftId);
      setResults((r) => ({ ...r, [meterId]: { status: 'saved' } }));
      toast.success('Чернетку підтверджено');
    } catch (error) {
      setResults((r) => ({
        ...r,
        [meterId]: { status: 'error', message: readingErrorMessage(error) },
      }));
    } finally {
      setConfirmingId(null);
    }
  }

  async function onSubmit(v: BatchReadingsValues) {
    const toSend = v.entries.filter(
      (e) => !savedIds.has(e.meterId) && !isEntryEmpty(e) && !isUntouchedDraft(e),
    );
    const settled = await Promise.allSettled(toSend.map((e) => saveEntry(v, e)));
    const next = { ...results };
    settled.forEach((outcome, i) => {
      next[toSend[i].meterId] =
        outcome.status === 'fulfilled'
          ? { status: 'saved' }
          : { status: 'error', message: readingErrorMessage(outcome.reason) };
    });
    setResults(next);

    const failed = settled.filter((s) => s.status === 'rejected').length;
    const ok = settled.length - failed;
    if (failed === 0) {
      setDone(true);
      markSaved();
      allowLeave();
      toast.success(`Показання збережено (${ok})`);
      router.push(back);
    } else if (ok > 0) {
      toast.warning(`Збережено ${ok} з ${settled.length}. Виправте помилки й надішліть ще раз`);
    } else {
      toast.error('Не вдалося зберегти показання');
    }
  }

  const dateWindow = isPeriod(period) ? readingDateWindow(period) : null;
  const busy = isSubmitting || done || confirmingId !== null;
  const entriesError =
    form.formState.errors.entries?.message ?? form.formState.errors.entries?.root?.message;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="period"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="readings-period">Місяць</FieldLabel>
                <Input
                  {...field}
                  id="readings-period"
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
                <FieldLabel htmlFor="readings-date">Дата зняття</FieldLabel>
                <Input
                  {...field}
                  id="readings-date"
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

        <p className="text-sm text-muted-foreground">Порожній лічильник буде пропущено.</p>
        <div className="space-y-3">
          {meters.map((meter, index) => (
            <MeterReadingEntry
              key={meter.id}
              meter={meter}
              index={index}
              control={form.control}
              result={results[meter.id]}
              disabled={busy}
              draft={prefills[meter.id]?.draft}
              untouchedDraft={isUntouchedDraft(entries[index])}
              confirming={confirmingId === meter.id}
              onConfirmDraft={(id) => void confirmDraft(meter.id, id)}
              period={period}
              hasLease={hasLease}
            />
          ))}
        </div>
        {entriesError && (
          <p role="alert" className="text-sm text-destructive">
            {entriesError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => confirmLeave(() => router.push(back))}
            disabled={busy}
          >
            {savedIds.size > 0 ? 'Готово' : 'Скасувати'}
          </Button>
          <Button type="submit" disabled={busy}>
            {isSubmitting ? 'Збереження…' : 'Зберегти показання'}
          </Button>
        </div>
      </FieldGroup>
      {dialog}
    </form>
  );
}
