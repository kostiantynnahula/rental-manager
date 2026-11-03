'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { emptyValues } from '@/components/meters/helpers/empty-values';
import { toReadingValuesInput } from '@/components/meters/helpers/reading-values-schema';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useResetAfterSave } from '@/hooks/use-reset-after-save';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import type { Meter } from '@/lib/api/queries/meters';
import { useCreateReading } from '@/lib/api/queries/readings';
import { formatDate, formatPeriod, todayDateOnly } from '@/lib/format';
import { defaultReadingPeriod, isPeriod, readingDateWindow } from '@/lib/period';
import {
  batchReadingsSchema,
  isEntryEmpty,
  type BatchReadingsValues,
} from './helpers/batch-readings-schema';
import { readingErrorMessage } from './helpers/reading-error-message';
import { MeterReadingEntry, type EntryResult } from './meter-reading-entry';

function entryDefaults(meters: Meter[]): BatchReadingsValues {
  const today = todayDateOnly();
  return {
    period: defaultReadingPeriod(today),
    readingDate: today,
    entries: meters.map((m) => ({ meterId: m.id, values: emptyValues(m.zoneScheme) })),
  };
}

interface ReadingEntryFormProps {
  apartmentId: string;
  // Active meters of the apartment, with their last confirmed values (= previous values).
  meters: Meter[];
}

// All active meters of an apartment for one month. Each filled meter is its own POST (confirm: true), so one
// failing meter doesn't block the others: saved ones get locked, failed ones keep the API message for a retry.
export function ReadingEntryForm({ apartmentId, meters }: ReadingEntryFormProps) {
  const router = useRouter();
  const create = useCreateReading();
  const back = `/apartments/${apartmentId}?tab=readings`;
  const [results, setResults] = useState<Record<string, EntryResult>>({});
  const [done, setDone] = useState(false);

  const savedIds = useMemo(
    () => new Set(Object.keys(results).filter((id) => results[id].status === 'saved')),
    [results],
  );
  const schema = useMemo(() => batchReadingsSchema(meters, savedIds), [meters, savedIds]);

  const form = useForm<BatchReadingsValues>({
    resolver: zodResolver(schema),
    defaultValues: entryDefaults(meters),
  });
  const { isSubmitting } = form.formState;
  const entries = useWatch({ control: form.control, name: 'entries' });
  const period = useWatch({ control: form.control, name: 'period' });
  // Unsaved = something typed for a meter that isn't saved yet.
  const hasUnsaved = entries.some((e) => !savedIds.has(e.meterId) && !isEntryEmpty(e));
  const { confirmLeave, allowLeave, dialog } = useUnsavedChanges(hasUnsaved && !done);
  // The page stays mounted (hidden) after navigating away: start fresh next time.
  const markSaved = useResetAfterSave(() => {
    form.reset(entryDefaults(meters));
    setResults({});
    setDone(false);
  });

  async function onSubmit(v: BatchReadingsValues) {
    const toSend = v.entries.filter((e) => !savedIds.has(e.meterId) && !isEntryEmpty(e));
    const settled = await Promise.allSettled(
      toSend.map((e) =>
        create.mutateAsync({
          meterId: e.meterId,
          body: {
            period: v.period,
            readingDate: v.readingDate,
            values: toReadingValuesInput(e.values),
            confirm: true,
          },
        }),
      ),
    );
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
  const busy = isSubmitting || done;
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
