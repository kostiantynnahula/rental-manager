import { z } from 'zod';
import { formatPeriod } from '@/lib/format';
import { isPeriod } from '@/lib/period';
import { normalizePrice } from '@/lib/tariff-prices';

const PRICE_HINT = 'Вкажіть ціну, напр. 4,32 (до 4 знаків після коми)';

// Same limits as OverrideApartmentTariffDto; the month must lie within the attachment ("YYYY-MM" compares as text).
export function overrideTariffSchema(activeFrom: string, activeTo: string | null) {
  return z.object({
    name: z.string().trim().min(1, 'Вкажіть назву').max(100, 'Не більше 100 символів'),
    effectiveFrom: z
      .string()
      .refine(isPeriod, 'Вкажіть місяць')
      .refine((v) => v >= activeFrom, `Не раніше ${formatPeriod(activeFrom)}`)
      .refine(
        (v) => activeTo === null || v <= activeTo,
        activeTo ? `Не пізніше ${formatPeriod(activeTo)}` : '',
      ),
    price: z.string().refine((v) => normalizePrice(v) !== null, PRICE_HINT),
    // Optional, electricity only.
    nightPrice: z.string().refine((v) => !v.trim() || normalizePrice(v) !== null, PRICE_HINT),
  });
}

export type OverrideTariffValues = z.infer<ReturnType<typeof overrideTariffSchema>>;
