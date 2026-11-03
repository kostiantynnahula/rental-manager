'use client';

import { Search } from 'lucide-react';
import { NativeSelect } from '@/components/native-select';
import { Input } from '@/components/ui/input';
import type { TariffKind, TariffPageSize } from '@/lib/api/queries/tariffs';
import { cn } from '@/lib/utils';
import { TARIFF_ACTIVE_FILTERS, TARIFF_KIND_FILTERS, TARIFF_PAGE_SIZES } from './constants/filters';
import type { TariffFilters } from './interfaces/tariff-filters';

interface TariffListFiltersProps {
  filters: TariffFilters;
  onChange: (patch: Partial<TariffFilters>) => void;
  // The search input is local (debounced into the URL by the parent).
  searchInput: string;
  onSearchInputChange: (value: string) => void;
}

export function TariffListFilters({
  filters,
  onChange,
  searchInput,
  onSearchInputChange,
}: TariffListFiltersProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div
        role="group"
        aria-label="Фільтр"
        className="grid grid-cols-3 rounded-lg bg-muted p-1 md:inline-grid"
      >
        {TARIFF_ACTIVE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={filters.active === filter.value}
            onClick={() => onChange({ active: filter.value })}
            className={cn(
              'h-10 rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors md:h-8',
              filters.active === filter.value && 'bg-background text-foreground shadow-sm',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="relative md:max-w-xs md:flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Пошук за назвою"
          aria-label="Пошук за назвою"
          maxLength={100}
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3 md:flex">
        <NativeSelect
          value={filters.kind}
          onChange={(e) => onChange({ kind: e.target.value as TariffKind | '' })}
          aria-label="Тип"
          className="md:w-44"
        >
          {TARIFF_KIND_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={filters.pageSize}
          onChange={(e) => onChange({ pageSize: Number(e.target.value) as TariffPageSize })}
          aria-label="На сторінці"
          className="md:w-20"
        >
          {TARIFF_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}
