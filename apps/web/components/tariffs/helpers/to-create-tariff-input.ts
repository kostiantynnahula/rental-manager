import type { CreateTariffInput, TariffPriceInput } from '@/lib/api/queries/tariffs';
import { normalizePrice } from '@/lib/tariff-prices';
import type { TariffFormValues } from './tariff-form-schema';
import { isZoned } from './is-zoned';
import { toTariffUtilities } from './to-tariff-utilities';

// Values already passed tariffFormSchema(true), so the prices are valid. The night price is sent only for
// electricity; DAY falls back to TOTAL in the API, so it isn't asked for.
export function toCreateTariffInput(v: TariffFormValues): CreateTariffInput {
  const utilities = toTariffUtilities(v.kind, v.utilitySet);
  const prices: TariffPriceInput[] = [
    { effectiveFrom: v.effectiveFrom, zone: 'TOTAL', price: normalizePrice(v.price) ?? v.price },
  ];
  const night = normalizePrice(v.nightPrice);
  if (night !== null && isZoned({ kind: v.kind, utilities })) {
    prices.push({ effectiveFrom: v.effectiveFrom, zone: 'NIGHT', price: night });
  }
  return {
    name: v.name,
    kind: v.kind,
    utilities,
    ...(v.notes && { notes: v.notes }),
    prices,
    ...(v.apartmentIds.length > 0 && { apartmentIds: v.apartmentIds }),
  };
}
