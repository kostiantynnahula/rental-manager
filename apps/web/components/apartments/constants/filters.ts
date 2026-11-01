import type { ApartmentActiveFilter } from '@/lib/api/queries/apartments';

// List filter, synced with ?active=.
export const APARTMENT_FILTERS: { value: ApartmentActiveFilter; label: string }[] = [
  { value: 'true', label: 'Активні' },
  { value: 'false', label: 'Архів' },
  { value: 'all', label: 'Усі' },
];

// Left out of the URL.
export const DEFAULT_APARTMENT_FILTER: ApartmentActiveFilter = 'true';
