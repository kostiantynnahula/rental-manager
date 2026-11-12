// A refused or failed API call: status + the API's own message (Nest: a string, or a list for validation errors).
// Never carries headers (the key) or the request.
export class ApiCallError extends Error {
  constructor(
    what: string,
    readonly status: number,
    readonly apiMessage: string,
  ) {
    super(`${what}: HTTP ${status}${apiMessage ? ` (${apiMessage})` : ''}`);
    this.name = 'ApiCallError';
  }
}

// The OpenAPI document has no error schema (typed `never`): read the Nest error body as unknown.
export function apiMessage(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('message' in body)) return '';
  const { message } = body;
  return Array.isArray(message) ? message.map(String).join('; ') : String(message);
}
