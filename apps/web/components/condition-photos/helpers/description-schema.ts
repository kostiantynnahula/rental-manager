import { z } from 'zod';
import {
  DESCRIPTION_ITEM_CONDITION_MAX_LENGTH,
  DESCRIPTION_ITEM_COUNT_MAX,
  DESCRIPTION_ITEM_NAME_MAX_LENGTH,
  DESCRIPTION_MAX_ITEMS,
  DESCRIPTION_SUMMARY_MAX_LENGTH,
} from '../constants/description';

// The description editor. `count` is the input's text: blank = not given (the API: only when more than one).
export const descriptionSchema = z.object({
  room: z.enum(['KITCHEN', 'BATHROOM', 'BEDROOM', 'LIVING', 'HALL', 'BALCONY', 'OTHER']),
  summary: z
    .string()
    .trim()
    .min(1, 'Опишіть фото')
    .max(DESCRIPTION_SUMMARY_MAX_LENGTH, `Не більше ${DESCRIPTION_SUMMARY_MAX_LENGTH} символів`),
  items: z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, 'Вкажіть назву')
          .max(
            DESCRIPTION_ITEM_NAME_MAX_LENGTH,
            `Не більше ${DESCRIPTION_ITEM_NAME_MAX_LENGTH} символів`,
          ),
        count: z
          .string()
          .trim()
          .refine(
            (v) => v === '' || (/^\d+$/.test(v) && +v >= 1 && +v <= DESCRIPTION_ITEM_COUNT_MAX),
            'Ціле число від 1',
          ),
        condition: z
          .string()
          .trim()
          .max(
            DESCRIPTION_ITEM_CONDITION_MAX_LENGTH,
            `Не більше ${DESCRIPTION_ITEM_CONDITION_MAX_LENGTH} символів`,
          ),
      }),
    )
    .max(DESCRIPTION_MAX_ITEMS, `Не більше ${DESCRIPTION_MAX_ITEMS} предметів`),
});

export type DescriptionValues = z.infer<typeof descriptionSchema>;
