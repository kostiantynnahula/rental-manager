import { todayDateOnly } from '@/lib/format';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Error text for a meter date (it becomes a reading date): required, not in the future, not before `min`.
export function meterDateError(value: string, min?: string): string | null {
  if (!DATE.test(value)) return 'Вкажіть дату';
  if (value > todayDateOnly()) return 'Не може бути в майбутньому';
  if (min && value < min) return 'Не раніше останнього показання';
  return null;
}
