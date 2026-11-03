'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useApartments } from '@/lib/api/queries/apartments';
import { apartmentsSummary } from './helpers/apartments-summary';

interface ApartmentsMultiSelectProps {
  id: string;
  value: string[];
  onChange: (apartmentIds: string[]) => void;
}

// Active apartments only (the API refuses archived ones). The popover stays open while ticking several.
export function ApartmentsMultiSelect({ id, value, onChange }: ApartmentsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const apartments = useApartments('true');
  const all = apartments.data ?? [];
  const selected = all.filter((a) => value.includes(a.id));
  const summary =
    selected.length === 0
      ? 'Не вибрано'
      : selected.length === 1
        ? selected[0].name
        : apartmentsSummary(selected.length);

  function toggle(apartmentId: string) {
    onChange(
      value.includes(apartmentId)
        ? value.filter((v) => v !== apartmentId)
        : [...value, apartmentId],
    );
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
          <span className={selected.length ? 'truncate' : 'truncate text-muted-foreground'}>
            {summary}
          </span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <Command>
          <CommandList>
            <CommandEmpty>
              {apartments.isPending ? 'Завантаження…' : 'Активних квартир немає'}
            </CommandEmpty>
            <CommandGroup>
              {/* The item's own check icon follows data-checked. */}
              {all.map((apartment) => (
                <CommandItem
                  key={apartment.id}
                  value={apartment.id}
                  data-checked={value.includes(apartment.id)}
                  onSelect={() => toggle(apartment.id)}
                >
                  <div className="min-w-0">
                    <p className="truncate">{apartment.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{apartment.address}</p>
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
