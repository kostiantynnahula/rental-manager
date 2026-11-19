import type { ConditionPhotoEvent } from '@/lib/api/queries/condition-photos';

export const EVENT_LABELS: Record<ConditionPhotoEvent, string> = {
  CHECK_IN: 'Заїзд',
  CHECK_OUT: 'Виїзд',
  CHANGE: 'Зміна',
};

// Order of the segmented choice in the forms.
export const EVENT_OPTIONS: ConditionPhotoEvent[] = ['CHECK_IN', 'CHECK_OUT', 'CHANGE'];
