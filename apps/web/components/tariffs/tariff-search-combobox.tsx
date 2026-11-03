'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTariffs, type Tariff } from '@/lib/api/queries/tariffs';
import { TARIFF_KIND_LABELS } from './constants/labels';
import { tariffUtilitiesLabel } from './helpers/tariff-utilities-label';

interface TariffSearchComboboxProps {
  id: string;
  value: Tariff | null;
  onChange: (tariff: Tariff) => void;
  // Already attached to the apartment now: hidden from the results.
  excludeIds: string[];
  invalid?: boolean;
}

// Server-side search over active tariffs (GET /tariffs?search=, first page); cmdk's own filtering is off.
export function TariffSearchCombobox({
  id,
  value,
  onChange,
  excludeIds,
  invalid,
}: TariffSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 300);
  const tariffs = useTariffs({
    active: 'true',
    page: 1,
    pageSize: 20,
    ...(debounced && { search: debounced }),
  });
  const results = (tariffs.data?.items ?? []).filter((t) => !excludeIds.includes(t.id));

  function select(tariff: Tariff) {
    onChange(tariff);
    setOpen(false);
    setSearch('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid}
          className="w-full justify-between font-normal"
        >
          <span className={value ? 'truncate' : 'truncate text-muted-foreground'}>
            {value?.name ?? 'Оберіть тариф'}
          </span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Назва тарифу"
            maxLength={100}
          />
          <CommandList>
            <CommandEmpty>
              {tariffs.isPending || tariffs.isFetching ? 'Пошук…' : 'Нічого не знайдено'}
            </CommandEmpty>
            {results.map((tariff) => (
              <CommandItem key={tariff.id} value={tariff.id} onSelect={() => select(tariff)}>
                <div className="min-w-0">
                  <p className="truncate">{tariff.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {TARIFF_KIND_LABELS[tariff.kind]}
                    {tariff.kind === 'METERED' && ` · ${tariffUtilitiesLabel(tariff.utilities)}`}
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
