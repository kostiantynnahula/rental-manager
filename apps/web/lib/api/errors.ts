// Non-2xx API response, thrown from query/mutation functions so React Query sees an error.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    // Parsed error body (Nest: { statusCode, message, error }), or undefined if there was none.
    readonly body: unknown,
  ) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

// openapi-fetch returns { data } or { error } instead of throwing; turn errors into an ApiError.
// For 204 responses `data` is undefined.
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (!result.response.ok) throw new ApiError(result.response.status, result.error);
  return result.data as T;
}
