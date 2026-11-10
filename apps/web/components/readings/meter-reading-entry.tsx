'use client';

import { CircleCheck, CircleAlert } from 'lucide-react';
import type { Control } from 'react-hook-form';
import { meterTitle } from '@/components/meters/helpers/meter-title';
import { ReadingValuesInput } from '@/components/meters/reading-values-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Meter } from '@/lib/api/queries/meters';
import type { Reading } from '@/lib/api/queries/readings';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ZONE_SCHEME_LABELS } from '@/lib/utilities';
import type { BatchReadingsValues } from './helpers/batch-readings-schema';
import { missingZones } from './helpers/missing-zones';
import { missingZonesLabel } from './helpers/missing-zones-label';

export type EntryResult = { status: 'saved' } | { status: 'error'; message: string };

interface MeterReadingEntryProps {
  meter: Meter;
  index: number;
  control: Control<BatchReadingsValues>;
  result?: EntryResult;
  disabled?: boolean;
  // The meter's DRAFT for the month (its values are prefilled into the inputs).
  draft?: Reading;
  // The inputs still show the draft as stored.
  untouchedDraft?: boolean;
  confirming?: boolean;
  onConfirmDraft?: (readingId: string) => void;
  // The month being entered and whether a lease covers it (consumption warnings).
  period: string;
  hasLease: boolean;
}

// One meter in the batch form: title, previous values and an input per zone; plus its save result. A draft shows
// what it lacks; once complete and unedited it can be confirmed as is.
export function MeterReadingEntry({
  meter,
  index,
  control,
  result,
  disabled,
  draft,
  untouchedDraft,
  confirming,
  onConfirmDraft,
  period,
  hasLease,
}: MeterReadingEntryProps) {
  const saved = result?.status === 'saved';
  const last = meter.lastReading;
  const lacking = draft ? missingZones(meter.zoneScheme, draft.values) : [];
  return (
    <Card
      className={cn(
        saved && 'border-green-600 bg-green-50',
        result?.status === 'error' && 'border-destructive',
      )}
    >
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{meterTitle(meter)}</span>
          <Badge variant="outline">{ZONE_SCHEME_LABELS[meter.zoneScheme]}</Badge>
          {draft && !saved && (
            <Badge variant="secondary">
              Чернетка{lacking.length > 0 && ` · ${missingZonesLabel(lacking)}`}
            </Badge>
          )}
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-green-700">
              <CircleCheck className="size-4" />
              Збережено
            </span>
          )}
        </div>
        {meter.serialNumber && (
          <p className="-mt-2 text-xs break-all text-muted-foreground">№ {meter.serialNumber}</p>
        )}
        <ReadingValuesInput
          control={control}
          name={`entries.${index}.values`}
          zoneScheme={meter.zoneScheme}
          utility={meter.utility}
          previous={last?.values}
          check={last ? { previousPeriod: last.period, period, hasLease } : undefined}
          idPrefix={`reading-${meter.id}`}
          disabled={saved || disabled}
        />
        {last && !saved && (
          <p className="text-xs text-muted-foreground">
            Попереднє показання від {formatDate(last.readingDate)}
          </p>
        )}
        {draft && !saved && untouchedDraft && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {lacking.length > 0
                ? 'Допишіть відсутні зони — чернетку буде підтверджено разом з іншими'
                : `Чернетка від ${formatDate(draft.readingDate)}`}
            </p>
            {lacking.length === 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onConfirmDraft?.(draft.id)}
                disabled={disabled}
              >
                {confirming ? 'Підтвердження…' : 'Підтвердити чернетку'}
              </Button>
            )}
          </div>
        )}
        {result?.status === 'error' && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {result.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
