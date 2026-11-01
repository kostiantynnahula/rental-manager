// Detail page tabs, synced with ?tab=.
export const APARTMENT_TABS = [
  { value: 'overview', label: 'Огляд' },
  { value: 'readings', label: 'Показання' },
  { value: 'meters', label: 'Лічильники' },
  { value: 'photos', label: 'Фото' },
  { value: 'leases', label: 'Договори' },
] as const;

export type ApartmentTab = (typeof APARTMENT_TABS)[number]['value'];

// Left out of the URL.
export const DEFAULT_APARTMENT_TAB: ApartmentTab = 'overview';
