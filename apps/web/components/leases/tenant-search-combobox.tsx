'use client';

import { UserPlus } from 'lucide-react';
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
import { useTenants, type TenantListItem } from '@/lib/api/queries/tenants';
import { formatPhone } from '@/lib/phone';

const MAX_RESULTS = 20;

interface TenantSearchComboboxProps {
  // Already on the lease: hidden from the results.
  excludeIds: string[];
  onSelect: (tenant: TenantListItem) => void;
}

// Server-side search (GET /tenants?search=, name or phone digits); cmdk's own filtering is off.
export function TenantSearchCombobox({ excludeIds, onSelect }: TenantSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 300);
  const tenants = useTenants(debounced);
  const results = (tenants.data ?? [])
    .filter((t) => !excludeIds.includes(t.id))
    .slice(0, MAX_RESULTS);

  function select(tenant: TenantListItem) {
    onSelect(tenant);
    setOpen(false);
    setSearch('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start">
          <UserPlus />
          Додати наявного мешканця
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Ім’я або телефон"
            maxLength={100}
          />
          <CommandList>
            <CommandEmpty>
              {tenants.isPending || tenants.isFetching ? 'Пошук…' : 'Нікого не знайдено'}
            </CommandEmpty>
            {results.map((tenant) => (
              <CommandItem key={tenant.id} value={tenant.id} onSelect={() => select(tenant)}>
                <div className="min-w-0">
                  <p className="truncate">{tenant.fullName}</p>
                  <p className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatPhone(tenant.phone)}
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
