// The Nest error body's message (a string, or a list for validation errors) — the OpenAPI document has no error
// schema, so openapi-fetch types it `never`. Empty when there is none.
export function apiErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('message' in error)) return '';
  const { message } = error;
  return Array.isArray(message) ? message.join('; ') : String(message);
}
