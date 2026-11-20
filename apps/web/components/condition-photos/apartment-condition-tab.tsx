'use client';

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useSearchParam } from '@/hooks/use-search-param';
import type { Apartment } from '@/lib/api/queries/apartments';
import { cn } from '@/lib/utils';
import { ConditionPhotoSearchResults } from './condition-photo-search-results';
import { ConditionPhotoTimeline } from './condition-photo-timeline';
import { DEFAULT_EVENT_FILTER, EVENT_FILTERS } from './constants/event-filter';
import { SEARCH_QUERY_MAX_LENGTH } from './constants/search';
import { parseEventFilter } from './helpers/parse-event-filter';
import { parseQuery } from './helpers/parse-query';
import { UploadConditionPhotosSheet } from './upload-condition-photos-sheet';

// Apartment page, tab "Стан": the whole history, or search results while ?q= is set. No lease here, so new photos
// default to "Зміна"; check-in/check-out photos are usually added from the lease page.
export function ApartmentConditionTab({ apartment }: { apartment: Apartment }) {
  // The URL holds the applied query (reload/share keeps it); the input updates it after a pause in typing.
  const [query, setQuery] = useSearchParam('q', parseQuery, '');
  const [filter, setFilter] = useSearchParam('event', parseEventFilter, DEFAULT_EVENT_FILTER);
  const [input, setInput] = useState(query);
  const debounced = useDebouncedValue(input.trim(), 300);
  const event = filter === 'all' ? undefined : filter;

  useEffect(() => {
    if (debounced !== query) setQuery(debounced);
    // Only react to typing; `query` changing from the URL must not write it back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="space-y-4">
      {/* Above both modes: the timeline's own upload would disappear while searching. */}
      {apartment.isActive && <UploadConditionPhotosSheet apartmentId={apartment.id} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Пошук: «кран на кухні»"
            aria-label="Пошук по фото стану"
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            className="pl-9"
          />
        </div>
        <div
          role="group"
          aria-label="Подія"
          className="grid grid-cols-4 rounded-lg bg-muted p-1 sm:ml-auto sm:inline-grid"
        >
          {EVENT_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'h-10 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors md:h-8',
                filter === f.value && 'bg-background text-foreground shadow-sm',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {query ? (
        <ConditionPhotoSearchResults apartmentId={apartment.id} query={query} event={event} />
      ) : (
        <ConditionPhotoTimeline
          apartmentId={apartment.id}
          canUpload={false}
          event={event}
          emptyText={event ? 'Фото з такою подією немає' : 'Фото стану ще не завантажені'}
        />
      )}
    </div>
  );
}
