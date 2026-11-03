import type { TariffKind } from '@/lib/api/queries/tariffs';

export const TARIFF_KIND_LABELS: Record<TariffKind, string> = {
  METERED: 'За лічильником',
  FIXED: 'Фіксований',
};

// Second line of the kind radio in the form.
export const TARIFF_KIND_HINTS: Record<TariffKind, string> = {
  METERED: 'ціна × спожите',
  FIXED: 'сума щомісяця',
};

export const ARCHIVED_REASON = 'Тариф в архіві';
export const IN_USE_REASON = 'Тариф підключено до квартир';
export const APARTMENT_ARCHIVED_REASON = 'Квартира в архіві';
export const ENDED_REASON = 'Підключення завершено';
