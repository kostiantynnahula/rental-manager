import type { ConditionPhotoRoom } from '@/lib/api/queries/condition-photos';

// The API's limits for a description (apps/api/src/condition-photos/constants/condition-photo-description.ts).
export const DESCRIPTION_MAX_ITEMS = 100;
export const DESCRIPTION_ITEM_NAME_MAX_LENGTH = 200;
export const DESCRIPTION_ITEM_CONDITION_MAX_LENGTH = 500;
export const DESCRIPTION_SUMMARY_MAX_LENGTH = 2000;
// PG int max: the API's @Max for count.
export const DESCRIPTION_ITEM_COUNT_MAX = 2147483647;

// Every room in the editor's select, OTHER included (ROOM_LABELS hides it on display).
export const ROOM_OPTIONS: { value: ConditionPhotoRoom; label: string }[] = [
  { value: 'KITCHEN', label: 'Кухня' },
  { value: 'BATHROOM', label: 'Ванна кімната' },
  { value: 'BEDROOM', label: 'Спальня' },
  { value: 'LIVING', label: 'Вітальня' },
  { value: 'HALL', label: 'Коридор' },
  { value: 'BALCONY', label: 'Балкон' },
  { value: 'OTHER', label: 'Інше' },
];
