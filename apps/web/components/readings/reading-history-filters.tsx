'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Meter } from '@/lib/api/queries/meters';
import { hasHistoryFilters } from './helpers/has-history-filters';
import type { HistoryFilters } from './interfaces/history-filters';
import { ReadingHistoryMeterFilter } from './reading-history-meter-filter';

interface ReadingHistoryFiltersProps {
  filters: HistoryFilters;
  onChange: (patch: Partial<HistoryFilters>) => void;
  meters: Meter[];
  // "з" is after "по": shown on the field, the parent doesn't query.
  rangeInvalid: boolean;
}

export function ReadingHistoryFilters({
  filters,
  onChange,
  meters,
  rangeInvalid,
}: ReadingHistoryFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(2,10rem)_minmax(0,16rem)_auto] md:items-end">
        <Field data-invalid={rangeInvalid}>
          <FieldLabel htmlFor="history-from">З</FieldLabel>
          <Input
            id="history-from"
            type="month"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => onChange({ from: e.target.value })}
            aria-invalid={rangeInvalid}
          />
        </Field>
        <Field data-invalid={rangeInvalid}>
          <FieldLabel htmlFor="history-to">По</FieldLabel>
          <Input
            id="history-to"
            type="month"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => onChange({ to: e.target.value })}
            aria-invalid={rangeInvalid}
          />
        </Field>
        <Field className="col-span-2 md:col-span-1">
          <FieldLabel htmlFor="history-meters">Лічильники</FieldLabel>
          <ReadingHistoryMeterFilter
            id="history-meters"
            meters={meters}
            value={filters.meterIds}
            onChange={(meterIds) => onChange({ meterIds })}
          />
        </Field>
        {hasHistoryFilters(filters) && (
          <Button
            type="button"
            variant="ghost"
            className="self-end"
            onClick={() => onChange({ from: '', to: '', meterIds: [] })}
          >
            <X />
            Скинути
          </Button>
        )}
      </div>
      {rangeInvalid && <FieldError>Місяць «з» має бути не пізніше за «по»</FieldError>}
    </div>
  );
}
