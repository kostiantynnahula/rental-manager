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
  // Only when the server message mentions this text (e.g. 'phone' for a 400 about that property).
  bodyIncludes?: string;
  field: Path<T>;
  // More fields that get the same message (e.g. both dates of an overlapping lease); focus stays on `field`.
  alsoFields?: Path<T>[];
  message: string;
}

// Nest error bodies: { message: string | string[] }.
function serverMessages(body: unknown): string[] {
  if (typeof body !== 'object' || body === null || !('message' in body)) return [];
  const { message } = body;
  if (typeof message === 'string') return [message];
  return Array.isArray(message) ? message.filter((m): m is string => typeof m === 'string') : [];
}

function ruleMatches(rule: { status: number; bodyIncludes?: string }, error: ApiError): boolean {
  if (rule.status !== error.status) return false;
  const text = rule.bodyIncludes;
  return !text || serverMessages(error.body).some((m) => m.includes(text));
}

// The single place that turns a failed mutation into UI feedback: an error on the form field when a rule
// matches (e.g. 409 duplicate name → "name"), otherwise a toast — with `messages[status]` instead of the
// generic text when given (actions without a form, e.g. 409 on delete).
export function applyApiError<T extends FieldValues>(
  error: unknown,
  options: {
    setError?: UseFormSetError<T>;
    fields?: FieldErrorRule<T>[];
    messages?: Partial<Record<number, string>>;
  } = {},
): void {
  if (error instanceof ApiError && options.setError) {
    const rule = options.fields?.find((r) => ruleMatches(r, error));
    if (rule) {
      options.setError(
        rule.field,
        { type: 'server', message: rule.message },
        { shouldFocus: true },
      );
      for (const field of rule.alsoFields ?? [])
        options.setError(field, { type: 'server', message: rule.message });
      return;
    }
  }
  const override = error instanceof ApiError ? options.messages?.[error.status] : undefined;
  toast.error(override ?? apiErrorMessage(error));
}
