import { APARTMENT_TABS, DEFAULT_APARTMENT_TAB, type ApartmentTab } from '../constants/tabs';

// Unknown or missing ?tab= falls back to the default tab.
export function parseTab(value: string | null): ApartmentTab {
  return APARTMENT_TABS.find((t) => t.value === value)?.value ?? DEFAULT_APARTMENT_TAB;
}
