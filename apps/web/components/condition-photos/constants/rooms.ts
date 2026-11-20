import type { ConditionPhotoRoom } from '@/lib/api/queries/condition-photos';

// The room of the worker's description. OTHER says nothing → not shown.
export const ROOM_LABELS: Record<ConditionPhotoRoom, string | null> = {
  KITCHEN: 'Кухня',
  BATHROOM: 'Ванна кімната',
  BEDROOM: 'Спальня',
  LIVING: 'Вітальня',
  HALL: 'Коридор',
  BALCONY: 'Балкон',
  OTHER: null,
};
