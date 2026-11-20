import { DEFAULT_EVENT_FILTER, EVENT_FILTERS, type EventFilter } from '../constants/event-filter';

// Unknown or missing ?event= falls back to all events.
export function parseEventFilter(value: string | null): EventFilter {
  return EVENT_FILTERS.find((f) => f.value === value)?.value ?? DEFAULT_EVENT_FILTER;
}
