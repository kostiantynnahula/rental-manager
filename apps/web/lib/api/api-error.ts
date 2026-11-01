import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError } from './errors';

// User-facing Ukrainian text for any error thrown by an API call (ApiError or a network failure).
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Немає з’єднання з сервером. Спробуйте ще раз';
  switch (error.status) {
    case 400:
      return 'Перевірте введені дані';
    case 404:
      return 'Не знайдено';
    case 409:
      return 'Конфлікт з наявними даними';
    case 429:
      return 'Забагато запитів. Спробуйте за хвилину';
  }
  return error.status >= 500 ? 'Помилка сервера. Спробуйте пізніше' : 'Щось пішло не так';
}

export function isNotFoundError(error: unknown): boolean {
  // 400 = malformed id (ParseUUIDPipe) — for the user that's "not found" too.
  return error instanceof ApiError && (error.status === 404 || error.status === 400);
}

export interface FieldErrorRule<T extends FieldValues> {
  status: number;
  field: Path<T>;
  message: string;
}

// The single place that turns a failed mutation into UI feedback: an error on the form field when a rule
// matches (e.g. 409 duplicate name → "name"), otherwise a toast.
export function applyApiError<T extends FieldValues>(
  error: unknown,
  options: { setError?: UseFormSetError<T>; fields?: FieldErrorRule<T>[] } = {},
): void {
  if (error instanceof ApiError && options.setError) {
    const rule = options.fields?.find((r) => r.status === error.status);
    if (rule) {
      options.setError(
        rule.field,
        { type: 'server', message: rule.message },
        { shouldFocus: true },
      );
      return;
    }
  }
  toast.error(apiErrorMessage(error));
}
