import { z } from 'zod';
import { isPeriod } from '@/lib/period';
import { normalizePrice } from '@/lib/tariff-prices';

// One price row: same limits as TariffPriceInputDto (≤ 4 decimals, ≤ 8 integer digits).
export const tariffPriceSchema = z.object({
  effectiveFrom: z.string().refine(isPeriod, 'Вкажіть місяць'),
  zone: z.enum(['TOTAL', 'DAY', 'NIGHT']),
  price: z
    .string()
    .refine((v) => normalizePrice(v) !== null, 'Вкажіть ціну, напр. 4,32 (до 4 знаків після коми)'),
});

export type TariffPriceFormValues = z.infer<typeof tariffPriceSchema>;
