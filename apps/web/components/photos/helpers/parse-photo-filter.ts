import { DEFAULT_PHOTO_FILTER, PHOTO_FILTERS, type PhotoFilter } from '../constants/filters';

// Unknown or missing ?photos= falls back to the default filter.
export function parsePhotoFilter(value: string | null): PhotoFilter {
  return PHOTO_FILTERS.find((f) => f.value === value)?.value ?? DEFAULT_PHOTO_FILTER;
}
