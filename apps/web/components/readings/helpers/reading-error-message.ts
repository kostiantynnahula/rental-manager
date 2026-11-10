import { apiErrorMessage, serverMessages } from '@/lib/api/api-error';
import { ApiError } from '@/lib/api/errors';

// API rule messages (ReadingsService / checkConfirmRules) → what to show next to the meter.
const KNOWN: { fragment: string; message: string }[] = [
  { fragment: 'lower than the previous', message: 'Менше за попереднє підтверджене показання' },
  { fragment: 'higher than the next', message: 'Більше за наступне підтверджене показання' },
  {
    fragment: 'must be between',
    message: 'Дата показання поза дозволеним періодом для цього місяця',
  },
  { fragment: 'in the future', message: 'Дата не може бути в майбутньому' },
  { fragment: 'before the meter was installed', message: 'Дата раніше встановлення лічильника' },
  { fragment: 'already exists', message: 'За цей місяць уже є підтверджене показання' },
  { fragment: 'Meter is removed', message: 'Лічильник знято' },
  { fragment: 'missing)', message: 'Заповнено не всі зони лічильника' },
  { fragment: 'belongs to another apartment', message: 'Фото належить іншій квартирі' },
  { fragment: 'photo not found', message: 'Фото не знайдено' },
];

export function readingErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const messages = serverMessages(error.body);
    const known = KNOWN.filter((k) => messages.some((m) => m.includes(k.fragment)));
    if (known.length > 0) return known.map((k) => k.message).join('. ');
  }
  return apiErrorMessage(error);
}
