import type { ApartmentActiveFilter } from '@/lib/api/queries/apartments';
import { APARTMENT_FILTERS, DEFAULT_APARTMENT_FILTER } from '../constants/filters';

// Unknown or missing ?active= falls back to the default filter.
export function parseActiveFilter(value: string | null): ApartmentActiveFilter {
  return APARTMENT_FILTERS.find((f) => f.value === value)?.value ?? DEFAULT_APARTMENT_FILTER;
}
