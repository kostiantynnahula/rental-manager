'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Meter } from '@/lib/api/queries/meters';
import { cn } from '@/lib/utils';
import { meterFilterLabel } from './helpers/meter-filter-label';
import { metersSummary } from './helpers/meters-summary';

interface ReadingHistoryMeterFilterProps {
  id: string;
  // All meters of the apartment (removed too), already ordered.
  meters: Meter[];
  value: string[];
  onChange: (meterIds: string[]) => void;
}

// Multi-select: nothing selected = all meters. The popover stays open while ticking several meters.
export function ReadingHistoryMeterFilter({
  id,
  meters,
  value,
  onChange,
}: ReadingHistoryMeterFilterProps) {
  const [open, setOpen] = useState(false);
  const selected = meters.filter((m) => value.includes(m.id));
  const summary =
    selected.length === 0
      ? 'Усі лічильники'
      : selected.length === 1
        ? meterFilterLabel(selected[0])
        : metersSummary(selected.length);

  function toggle(meterId: string) {
    onChange(value.includes(meterId) ? value.filter((v) => v !== meterId) : [...value, meterId]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {/* The item's own check icon follows data-checked. */}
              <CommandItem
                value="__all__"
                data-checked={value.length === 0}
                onSelect={() => onChange([])}
              >
                Усі лічильники
              </CommandItem>
              {meters.map((meter) => (
                <CommandItem
                  key={meter.id}
                  value={meter.id}
                  data-checked={value.includes(meter.id)}
                  onSelect={() => toggle(meter.id)}
                >
                  <div className="min-w-0">
                    <p className={cn('truncate', meter.removedAt && 'text-muted-foreground')}>
                      {meterFilterLabel(meter)}
                    </p>
                    {meter.serialNumber && (
                      <p className="truncate text-xs text-muted-foreground">
                        № {meter.serialNumber}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
