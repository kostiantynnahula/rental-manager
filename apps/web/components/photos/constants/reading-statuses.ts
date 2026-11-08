import type { PeriodReadingStatus } from '@/lib/api/queries/readings';
import type { PhotoReading } from '@/lib/api/queries/photos';

// Readings already taken from a photo.
export const PHOTO_READING_STATUS_LABELS: Record<PhotoReading['status'], string> = {
  CONFIRMED: 'Підтверджено',
  DRAFT: 'Чернетка',
  CANCELLED: 'Скасовано',
};

// A meter's state for the chosen month, shown in the meter select.
export const PERIOD_STATUS_LABELS: Record<PeriodReadingStatus, string> = {
  MISSING: 'немає показання',
  DRAFT: 'є чернетка',
  CONFIRMED: 'вже внесено',
};
