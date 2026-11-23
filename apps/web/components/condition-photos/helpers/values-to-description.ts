import type {
  ConditionPhotoDescription,
  ConditionPhotoItem,
} from '@/lib/api/queries/condition-photos';
import type { DescriptionValues } from './description-schema';

// Parsed (trimmed) editor values → the PATCH body's description; blank count / condition are left out.
export function valuesToDescription(values: DescriptionValues): ConditionPhotoDescription {
  return {
    room: values.room,
    summary: values.summary,
    items: values.items.map((item) => {
      const result: ConditionPhotoItem = { name: item.name };
      if (item.count !== '') result.count = Number(item.count);
      if (item.condition !== '') result.condition = item.condition;
      return result;
    }),
  };
}
