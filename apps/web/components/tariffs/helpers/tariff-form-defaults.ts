import type { TariffDetail } from '@/lib/api/queries/tariffs';
import { todayDateOnly } from '@/lib/format';
import type { TariffFormValues } from './tariff-form-schema';
import { utilitySetOf } from './utility-set-of';

// A function, not a constant: a new tariff's first price starts in the current month (fresh Kyiv "today").
// `apartmentId`: opened from an apartment's "Тарифи" tab — that apartment is preselected.
export function tariffFormDefaults(tariff?: TariffDetail, apartmentId?: string): TariffFormValues {
  return {
    name: tariff?.name ?? '',
    kind: tariff?.kind ?? 'METERED',
    utilitySet: tariff ? (utilitySetOf(tariff.utilities)?.value ?? '') : '',
    notes: tariff?.notes ?? '',
    effectiveFrom: todayDateOnly().slice(0, 7),
    price: '',
    nightPrice: '',
    apartmentIds: apartmentId ? [apartmentId] : [],
  };
}
