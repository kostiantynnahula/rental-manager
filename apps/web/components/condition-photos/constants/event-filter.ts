import type { ConditionPhotoEvent } from '@/lib/api/queries/condition-photos';
import { EVENT_LABELS, EVENT_OPTIONS } from './events';

export type EventFilter = 'all' | ConditionPhotoEvent;

// Apartment tab «Стан» filter, synced with ?event= (both the timeline and the search).
export const EVENT_FILTERS: { value: EventFilter; label: string }[] = [
  { value: 'all', label: 'Усі' },
  ...EVENT_OPTIONS.map((event) => ({ value: event, label: EVENT_LABELS[event] })),
];

// Left out of the URL.
export const DEFAULT_EVENT_FILTER: EventFilter = 'all';
