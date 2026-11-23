import type { ConditionPhotoDescription } from '@/lib/api/queries/condition-photos';
import type { DescriptionValues } from './description-schema';

// Editor defaults. No description yet (PENDING / FAILED) → an empty one, so it can be described by hand.
export function descriptionToValues(description: ConditionPhotoDescription | null): DescriptionValues {
  return {
    room: description?.room ?? 'OTHER',
    summary: description?.summary ?? '',
    items: (description?.items ?? []).map((item) => ({
      name: item.name,
      count: item.count === undefined ? '' : String(item.count),
      condition: item.condition ?? '',
    })),
  };
}
