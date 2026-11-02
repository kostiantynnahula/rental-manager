'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { applyApiError } from '@/lib/api/api-error';
import { useFixInitialValues, type Meter } from '@/lib/api/queries/meters';
import { formatMeterValue } from '@/lib/meter-values';
import { zonesFor } from '@/lib/utilities';
import { readingValuesSchema, toReadingValuesInput } from './helpers/reading-values-schema';
import { ReadingValuesInput } from './reading-values-input';

const schema = z.object({ values: readingValuesSchema() });
type Values = z.infer<typeof schema>;

// Corrects the INITIAL reading (the API cancels the old one and confirms the new): only while the meter has no
// regular readings, so the starting point of consumption can still change.
export function FixInitialValuesForm({ meter, onDone }: { meter: Meter; onDone: () => void }) {
  const fix = useFixInitialValues(meter.id);
  // With no REGULAR readings yet, the last confirmed reading is the INITIAL one.
  const current = meter.lastReading?.values ?? [];
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      values: zonesFor(meter.zoneScheme).map((zone) => {
        const v = current.find((c) => c.zone === zone);
        return { zone, value: v ? formatMeterValue(v.value) : '' };
      }),
    },
  });

  async function onSubmit(v: Values) {
    try {
      await fix.mutateAsync(toReadingValuesInput(v.values));
      toast.success('Початкові показання виправлено');
      onDone();
    } catch (error) {
      applyApiError(error, {
        messages: { 409: 'Вже є показання — початкові змінити не можна' },
      });
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <ReadingValuesInput
          control={form.control}
          name="values"
          zoneScheme={meter.zoneScheme}
          utility={meter.utility}
          idPrefix="meter-fix"
        />
        <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
          {form.formState.isSubmitting ? 'Збереження…' : 'Зберегти'}
        </Button>
      </FieldGroup>
    </form>
  );
}
