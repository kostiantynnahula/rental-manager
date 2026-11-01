'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useSearchParam } from '@/hooks/use-search-param';
import { useTenants, type TenantListItem } from '@/lib/api/queries/tenants';
import { TENANTS_INITIAL_SORTING } from './constants/sorting';
import { parseSearch } from './helpers/parse-search';
import { TenantCard } from './tenant-card';
import { tenantColumns } from './tenant-columns';

// Module-level so DataTable's memo isn't invalidated on every render.
const tenantHref = (t: TenantListItem) => `/tenants/${t.id}`;
const tenantId = (t: TenantListItem) => t.id;
const renderTenantCard = (t: TenantListItem) => <TenantCard tenant={t} />;

export function TenantsList() {
  // The URL holds the applied search (reload/share keeps it); the input updates it after a pause in typing.
  const [search, setSearch] = useSearchParam('search', parseSearch, '');
  const [input, setInput] = useState(search);
  const debounced = useDebouncedValue(input.trim(), 300);
  const tenants = useTenants(search);

  useEffect(() => {
    if (debounced !== search) setSearch(debounced);
    // Only react to typing; `search` changing from the URL must not write it back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Мешканці</h1>
        <Button asChild>
          <Link href="/tenants/new">
            <Plus />
            Додати мешканця
          </Link>
        </Button>
      </div>

      <div className="relative md:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Пошук за ім’ям або телефоном"
          aria-label="Пошук за ім’ям або телефоном"
          maxLength={100}
          className="pl-9"
        />
      </div>

      {tenants.isError ? (
        <QueryError error={tenants.error} onRetry={() => void tenants.refetch()} />
      ) : (
        // No getSearchText: the API already filtered by ?search=.
        <DataTable
          columns={tenantColumns}
          data={tenants.data}
          isLoading={tenants.isPending}
          getRowId={tenantId}
          getRowHref={tenantHref}
          renderCard={renderTenantCard}
          initialSorting={TENANTS_INITIAL_SORTING}
          empty={search ? 'Нічого не знайдено' : 'Мешканців немає'}
        />
      )}
    </section>
  );
}
