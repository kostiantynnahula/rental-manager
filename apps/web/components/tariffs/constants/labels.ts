import type { TariffKind } from '@/lib/api/queries/tariffs';

export const TARIFF_KIND_LABELS: Record<TariffKind, string> = {
  METERED: 'За лічильником',
  FIXED: 'Фіксований',
  MANUAL: 'Ручна сума',
};

// Second line of the kind radio in the form.
export const TARIFF_KIND_HINTS: Record<TariffKind, string> = {
  METERED: 'ціна × спожите',
  FIXED: 'сума щомісяця',
  MANUAL: 'вводиться в рахунку щомісяця',
};

// The API rejects a kind change to or from MANUAL: one has prices, the other doesn't.
export const MANUAL_KIND_LOCKED = 'Ручну суму не можна змінити на інший тип — створіть новий тариф';
export const ARCHIVED_REASON = 'Тариф в архіві';
export const IN_USE_REASON = 'Тариф підключено до квартир';
export const APARTMENT_ARCHIVED_REASON = 'Квартира в архіві';
export const ENDED_REASON = 'Підключення завершено';
