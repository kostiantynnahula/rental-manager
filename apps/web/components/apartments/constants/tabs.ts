// Detail page tabs, synced with ?tab=.
export const APARTMENT_TABS = [
  { value: 'overview', label: 'Огляд' },
  { value: 'readings', label: 'Показання' },
  { value: 'meters', label: 'Лічильники' },
  { value: 'tariffs', label: 'Тарифи' },
  { value: 'statements', label: 'Рахунки' },
  { value: 'photos', label: 'Фото' },
  { value: 'condition', label: 'Стан' },
  { value: 'leases', label: 'Договори' },
  { value: 'chat', label: 'Чат' },
] as const;

export type ApartmentTab = (typeof APARTMENT_TABS)[number]['value'];

// Left out of the URL.
export const DEFAULT_APARTMENT_TAB: ApartmentTab = 'overview';
