import type { ConditionPhotoIndexStatus } from '@/lib/api/queries/condition-photos';

// Shown in the lightbox; INDEXED (searchable) needs no line.
export const INDEX_STATUS_LABELS: Record<ConditionPhotoIndexStatus, string | null> = {
  PENDING: 'Опис готується…',
  DESCRIBED: 'Описано, ще не в пошуку',
  INDEXED: null,
  FAILED: 'Не вдалося описати',
};
