import { z } from 'zod';
import { isPeriod } from '@/lib/period';
import { normalizePrice } from '@/lib/tariff-prices';
import { UTILITY_SETS } from '../constants/utility-sets';

const PRICE_HINT = 'Вкажіть ціну, напр. 4,32 (до 4 знаків після коми)';

// Same limits as CreateTariffDto. The initial price block exists only when creating (`withPrices`); a later
// price change is a new row on the tariff page.
export function tariffFormSchema(withPrices: boolean) {
  return z
    .object({
      name: z.string().trim().min(1, 'Вкажіть назву').max(100, 'Не більше 100 символів'),
      kind: z.enum(['METERED', 'FIXED']),
      // UTILITY_SETS value; '' for a fixed fee.
      utilitySet: z.string(),
      notes: z.string().trim(),
      effectiveFrom: z.string(),
      price: z.string(),
      // Optional, electricity only.
      nightPrice: z.string(),
      // Create only: attached from the first price month on.
      apartmentIds: z.array(z.string()),
    })
    .superRefine((v, ctx) => {
      if (v.kind === 'METERED' && !UTILITY_SETS.some((s) => s.value === v.utilitySet)) {
        ctx.addIssue({ code: 'custom', path: ['utilitySet'], message: 'Оберіть послугу' });
      }
      if (!withPrices) return;
      if (!isPeriod(v.effectiveFrom)) {
        ctx.addIssue({ code: 'custom', path: ['effectiveFrom'], message: 'Вкажіть місяць' });
      }
      if (normalizePrice(v.price) === null) {
        ctx.addIssue({ code: 'custom', path: ['price'], message: PRICE_HINT });
      }
      if (v.nightPrice.trim() && normalizePrice(v.nightPrice) === null) {
        ctx.addIssue({ code: 'custom', path: ['nightPrice'], message: PRICE_HINT });
      }
    });
}

export type TariffFormValues = z.infer<ReturnType<typeof tariffFormSchema>>;
