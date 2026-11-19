import { z } from 'zod';
import { todayDateOnly } from '@/lib/format';
import { NOTE_MAX_LENGTH } from '../constants/note';

// Event, date, note — shared by the upload and edit forms. Blank note → '' (sent as null / left out).
export const conditionPhotoSchema = z.object({
  event: z.enum(['CHECK_IN', 'CHECK_OUT', 'CHANGE']),
  takenOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Вкажіть дату')
    // Not checked by the API, but a future date is always a typo. "YYYY-MM-DD" compares as a string.
    .refine((d) => d <= todayDateOnly(), 'Не може бути в майбутньому'),
  note: z.string().trim().max(NOTE_MAX_LENGTH, `Не більше ${NOTE_MAX_LENGTH} символів`),
});

export type ConditionPhotoValues = z.infer<typeof conditionPhotoSchema>;
